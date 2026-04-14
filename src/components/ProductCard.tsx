import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { formatPrice, getLocalizedValue } from '../lib/utils';
import { Database } from '../lib/supabase';

type Product = Database['public']['Tables']['products']['Row'];

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { language, t } = useTranslation();

  return (
    <Link
      to={`/product/${product.slug}`}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
        {product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={getLocalizedValue(product.name, language)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-semibold">{t('out_of_stock')}</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
          {getLocalizedValue(product.name, language)}
        </h3>

        <div className="flex items-center justify-between mt-2">
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {formatPrice(product.price)}
          </span>
          {product.stock > 0 && product.stock < 10 && (
            <span className="text-xs text-orange-500">
              {language === 'ru' ? 'Осталось' : 'Qoldi'}: {product.stock}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
