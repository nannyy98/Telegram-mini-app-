import { ShoppingBag, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { useTranslation } from '../hooks/useTranslation';

export const Header = () => {
  const { t } = useTranslation();
  const totalItems = useCartStore((state) => state.getTotalItems());

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/catalog" className="flex items-center space-x-2">
          <ShoppingBag className="w-6 h-6 text-blue-500" />
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            {t('app_name')}
          </span>
        </Link>

        <div className="flex items-center space-x-4">
          <Link to="/cart" className="relative">
            <ShoppingBag className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Link>

          <Link to="/profile">
            <User className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </Link>
        </div>
      </div>
    </header>
  );
};
