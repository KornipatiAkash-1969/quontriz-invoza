import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import ProductTourModal from '../components/tour/ProductTourModal';

const ProductTourContext = createContext(null);

export function ProductTourProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Automatically trigger product tour for any newly logged in user (Owner or Staff)
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const tourKey = `quontriz_tour_seen_${user.id}`;
      const hasSeen = localStorage.getItem(tourKey);

      if (!hasSeen) {
        // Automatically launch product tour after page load
        const timer = setTimeout(() => {
          setIsTourOpen(true);
        }, 700);
        return () => clearTimeout(timer);
      }
    }
  }, [isAuthenticated, user?.id]);

  const openTour = () => {
    setIsTourOpen(true);
  };

  const closeTour = () => {
    setIsTourOpen(false);
    if (user?.id) {
      localStorage.setItem(`quontriz_tour_seen_${user.id}`, 'true');
    }
  };

  const restartTour = () => {
    setIsTourOpen(true);
  };

  return (
    <ProductTourContext.Provider
      value={{
        isTourOpen,
        openTour,
        closeTour,
        restartTour,
      }}
    >
      {children}
      {isTourOpen && <ProductTourModal isOpen={isTourOpen} onClose={closeTour} />}
    </ProductTourContext.Provider>
  );
}

export function useProductTour() {
  const context = useContext(ProductTourContext);
  if (!context) {
    throw new Error('useProductTour must be used within a ProductTourProvider');
  }
  return context;
}
