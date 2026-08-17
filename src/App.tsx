import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './lib/firebase.ts';
import { getAuthToken, saveAuthToken, clearAuthToken } from './utils/authClient.ts';
import { CalculationFormData, SavedCalculationItem, UserProfile, BaseRateItem } from './types.ts';
import { DEFAULT_FALLBACK_RATES } from './data/defaultBaseRates.ts';
import { calculateRegionalValue } from './utils/calculator.ts';
import { Header } from './components/Header.tsx';
import { CalculatorForm } from './components/CalculatorForm.tsx';
import { CalculationResultCard } from './components/CalculationResultCard.tsx';
import { HistoryList } from './components/HistoryList.tsx';
import { RegulationGuide } from './components/RegulationGuide.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { AdminBaseInfoPanel } from './components/AdminBaseInfoPanel.tsx';

const DEFAULT_FORM_DATA: CalculationFormData = {
  title: '',
  province: '',
  city: '',
  blockCode: '',
  landArea: 0,
  baseLandValue: 0,
  landUsage: 'residential_commercial_admin',
  streetWidth: 24,
  landSpecialCondition: 'none',
  hasBuilding: false,
  buildingArea: 0,
  structureType: 'concrete_steel',
  buildingUsage: 'residential_admin',
  floorNumber: 0,
  isCommercialAboveOrBelowGround: false,
  buildingAge: 0,
  completionStage: 'completed',
  isDistressedArea: false,
  isGovernmentHousing: false,
  notes: '',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'history' | 'guide' | 'admin'>('calculator');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('app_theme');
    return saved !== null ? saved === 'dark' : true;
  });
  const [formData, setFormData] = useState<CalculationFormData>(DEFAULT_FORM_DATA);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [baseRates, setBaseRates] = useState<BaseRateItem[]>(DEFAULT_FALLBACK_RATES);
  const [history, setHistory] = useState<SavedCalculationItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Sync dark mode class on <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('app_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('app_theme', 'light');
    }
  }, [darkMode]);

  // Load Base Rates from Database
  const fetchBaseRates = async () => {
    try {
      const res = await fetch('/api/base-rates');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setBaseRates(data);
        }
      }
    } catch {
      // Keep DEFAULT_FALLBACK_RATES if offline or error
    }
  };

  useEffect(() => {
    fetchBaseRates();
  }, []);

  // Check Local Auth Token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('firebase_token');
    const cachedUser = localStorage.getItem('cached_user_profile');
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch {}
    }

    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((dbUser) => {
          if (dbUser) {
            setUser(dbUser);
            localStorage.setItem('cached_user_profile', JSON.stringify(dbUser));
          } else {
            // Token is invalid/expired
            clearAuthToken();
          }
        })
        .catch(() => {
          // Network issue or server starting up - keep cached user silently
        });
    }
  }, []);

  // Sync Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          saveAuthToken(token);
          await syncUserProfile(token);
        } catch {
          // Handled gracefully
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch history when user changes or tab switches to history
  useEffect(() => {
    if (user && activeTab === 'history') {
      fetchUserHistory();
    }
  }, [user, activeTab]);

  const syncUserProfile = async (idToken: string) => {
    try {
      saveAuthToken(idToken);
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      if (res.ok) {
        const dbUser = await res.json();
        setUser(dbUser);
        localStorage.setItem('cached_user_profile', JSON.stringify(dbUser));
        fetchHistoryForUser(idToken);
      }
    } catch {
      // Handled gracefully
    }
  };

  const getAuthToken = async () => {
    const localToken = localStorage.getItem('auth_token');
    if (localToken) return localToken;

    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
    return '';
  };

  const fetchHistoryForUser = async (token: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/calculations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setHistory(data);
          localStorage.setItem('cached_user_calculations', JSON.stringify(data));
        }
      } else {
        const cached = localStorage.getItem('cached_user_calculations');
        if (cached) {
          try {
            setHistory(JSON.parse(cached));
          } catch {}
        }
      }
    } catch (err) {
      // Silently load cached history if network/server is momentarily unavailable
      const cached = localStorage.getItem('cached_user_calculations');
      if (cached) {
        try {
          setHistory(JSON.parse(cached));
        } catch {}
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchUserHistory = async () => {
    const token = await getAuthToken();
    if (token) {
      fetchHistoryForUser(token);
    }
  };

  const handleFormChange = (updates: Partial<CalculationFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setSaveSuccess(false);
  };

  const handleResetForm = () => {
    setFormData(DEFAULT_FORM_DATA);
    setSaveSuccess(false);
  };

  const handleSaveCalculation = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const breakdown = calculateRegionalValue(formData);
      const token = await getAuthToken();

      const res = await fetch('/api/calculations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: formData.title || 'محاسبه ارزش ملک',
          province: formData.province,
          city: formData.city,
          blockCode: formData.blockCode,
          landArea: formData.landArea,
          baseLandValue: formData.baseLandValue,
          landUsage: formData.landUsage,
          landUsageCoeff: breakdown.land.usageCoeff,
          streetWidth: formData.streetWidth,
          streetWidthCoeff: breakdown.land.streetWidthCoeff,
          landSpecialCondition: formData.landSpecialCondition,
          landSpecialCoeff: breakdown.land.specialConditionCoeff,
          totalLandValue: breakdown.land.totalLandValue,
          hasBuilding: formData.hasBuilding,
          buildingArea: formData.buildingArea,
          structureType: formData.structureType,
          buildingUsage: formData.buildingUsage,
          baseBuildingValue: breakdown.building.basePrice,
          floorNumber: formData.floorNumber,
          floorCoeff: breakdown.building.floorCoeff,
          buildingAge: formData.buildingAge,
          ageCoeff: breakdown.building.ageDiscountCoeff,
          completionStage: formData.completionStage,
          completionCoeff: breakdown.building.completionCoeff,
          isDistressed: formData.isDistressedArea,
          isGovernmentHousing: formData.isGovernmentHousing,
          totalBuildingValue: breakdown.building.totalBuildingValue,
          grandTotalValue: breakdown.grandTotalValue,
          notes: formData.notes,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        if (user) {
          fetchUserHistory();
        }
      }
    } catch (err) {
      console.error('Error saving calculation:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCalculation = async (id: number) => {
    const token = await getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/calculations/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
        const updated = history.filter((item) => item.id !== id);
        localStorage.setItem('cached_user_calculations', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Error deleting calculation:', err);
    }
  };

  const handleBulkDeleteCalculations = async (ids: number[]) => {
    const token = await getAuthToken();
    if (!token || ids.length === 0) return;
    try {
      const res = await fetch('/api/calculations/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids }),
      });

      if (res.ok) {
        setHistory((prev) => prev.filter((item) => !ids.includes(item.id)));
        const updated = history.filter((item) => !ids.includes(item.id));
        localStorage.setItem('cached_user_calculations', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Error in bulk deleting calculations:', err);
    }
  };

  const handleDeleteAllCalculations = async (scope: 'filtered' | 'all', filteredIds?: number[]) => {
    const token = await getAuthToken();
    if (!token) return;
    try {
      if (scope === 'filtered' && filteredIds && filteredIds.length > 0) {
        const res = await fetch('/api/calculations/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ids: filteredIds }),
        });

        if (res.ok) {
          setHistory((prev) => prev.filter((item) => !filteredIds.includes(item.id)));
          const updated = history.filter((item) => !filteredIds.includes(item.id));
          localStorage.setItem('cached_user_calculations', JSON.stringify(updated));
        }
      } else {
        const res = await fetch('/api/calculations/delete-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          setHistory([]);
          localStorage.removeItem('cached_user_calculations');
        }
      }
    } catch (err) {
      console.error('Error deleting all calculations:', err);
    }
  };

  const handleSelectHistoryItem = (item: SavedCalculationItem) => {
    setFormData({
      title: item.title,
      province: item.province || 'تهران',
      city: item.city || 'تهران',
      blockCode: item.blockCode || '',
      landArea: item.landArea,
      baseLandValue: item.baseLandValue,
      landUsage: (item.landUsage as any) || 'residential_commercial_admin',
      streetWidth: item.streetWidth,
      landSpecialCondition: (item.landSpecialCondition as any) || 'none',
      hasBuilding: item.hasBuilding,
      buildingArea: item.buildingArea || 0,
      structureType: (item.structureType as any) || 'concrete_steel',
      buildingUsage: (item.buildingUsage as any) || 'residential_admin',
      floorNumber: item.floorNumber || 0,
      isCommercialAboveOrBelowGround: false,
      buildingAge: item.buildingAge || 0,
      completionStage: (item.completionStage as any) || 'completed',
      isDistressedArea: !!item.isDistressed,
      isGovernmentHousing: !!item.isGovernmentHousing,
      notes: item.notes || '',
    });
    setActiveTab('calculator');
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('firebase_token');
      localStorage.removeItem('cached_user_profile');
      localStorage.removeItem('cached_user_calculations');
      await signOut(auth);
      setUser(null);
      setHistory([]);
      setActiveTab('calculator');
    } catch {
      setUser(null);
    }
  };

  const currentBreakdown = calculateRegionalValue(formData);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0A0A0C] text-slate-900 dark:text-[#E2E8F0] font-sans transition-colors selection:bg-amber-500 selection:text-black dir-rtl">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        user={user}
        onLoginClick={() => setIsAuthModalOpen(true)}
        onLogoutClick={handleLogout}
        savedCount={history.length}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'calculator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Form (8 cols on lg) */}
            <div className="lg:col-span-7 xl:col-span-8">
              <CalculatorForm
                formData={formData}
                onChange={handleFormChange}
                onReset={handleResetForm}
                baseRates={baseRates}
              />
            </div>

            {/* Right Sticky Result Box (4 cols on lg) */}
            <div className="lg:col-span-5 xl:col-span-4">
              <CalculationResultCard
                breakdown={currentBreakdown}
                formData={formData}
                user={user}
                onSave={handleSaveCalculation}
                isSaving={isSaving}
                saveSuccess={saveSuccess}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
              />
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryList
            history={history}
            loading={loadingHistory}
            user={user}
            onDelete={handleDeleteCalculation}
            onBulkDelete={handleBulkDeleteCalculations}
            onDeleteAll={handleDeleteAllCalculations}
            onSelectCalculation={handleSelectHistoryItem}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'guide' && <RegulationGuide baseRates={baseRates} />}

        {activeTab === 'admin' && (
          <AdminBaseInfoPanel
            user={user}
            baseRates={baseRates}
            onRefreshBaseRates={fetchBaseRates}
          />
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        user={user}
        setUser={setUser}
        onSyncUser={syncUserProfile}
      />
    </div>
  );
}
