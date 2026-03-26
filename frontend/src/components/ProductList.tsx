import { Package, Plus } from 'lucide-react';
import type { Product } from '../types';

const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Mineral Water (0.5L)', price: 1.50 },
  { id: 'p2', name: 'Tennis Balls (3 can)', price: 12.00 },
  { id: 'p3', name: 'Rental Racket', price: 5.00 },
  { id: 'p4', name: 'Grip Tape', price: 3.50 },
  { id: 'p5', name: 'Energy Drink', price: 2.50 },
  { id: 'p6', name: 'Towel (Rental)', price: 2.00 },
];

interface ProductListProps {
  onAddProduct: (product: Product) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ onAddProduct }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {MOCK_PRODUCTS.map(product => (
        <button
          key={product.id}
          onClick={() => onAddProduct(product)}
          className="flex flex-col items-start p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all text-left group"
        >
          <div className="flex justify-between items-start w-full mb-2">
            <div className="p-1.5 bg-white/5 rounded-lg text-white/40 group-hover:text-tennis-green transition-colors">
              <Package size={14} />
            </div>
            <Plus size={14} className="text-white/20 group-hover:text-tennis-green transition-colors" />
          </div>
          <span className="text-sm font-semibold truncate w-full">{product.name}</span>
          <span className="text-xs text-tennis-green font-bold">${product.price.toFixed(2)}</span>
        </button>
      ))}
    </div>
  );
};
