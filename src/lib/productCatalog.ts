export type ProductCategory = "FOOD_FRESH" | "FOOD_DRY" | "CLEANING" | "TABLEWARE" | "PACKAGING";
export type ProductStatus = "CRITICAL" | "WARNING" | "HEALTHY";

export interface SharedProduct {
  id: string;
  name: string;
  category: ProductCategory;
  supplier: string;
  supplierPhone: string;
  currentStock: number;
  unit: string;
  dailyConsumption: number;
  daysRemaining: number;
  leadTimeDays: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  unitPrice: number;
  lastPurchasePrice: number;
  purchaseCadenceDays: number;
  status: ProductStatus;
  recipeUnit: "g" | "ml" | "ud";
  purchaseToRecipeFactor: number;
  allergens: string[];
}

/** Catálogo maestro local mientras el ERP no expone todavía su API de productos. */
export const SHARED_PRODUCT_CATALOG: SharedProduct[] = [
  { id: "p1", name: "Solomillo de Ternera Madurada", category: "FOOD_FRESH", supplier: "Carnes Selección S.L.", supplierPhone: "+34612345678", currentStock: 4.5, unit: "kg", dailyConsumption: 2.2, daysRemaining: 2, leadTimeDays: 2, reorderPoint: 5, suggestedOrderQty: 15, unitPrice: 28.5, lastPurchasePrice: 28.5, purchaseCadenceDays: 4, status: "CRITICAL", recipeUnit: "g", purchaseToRecipeFactor: 1000, allergens: [] },
  { id: "p2", name: "Queso Parmesano Reggiano 24 Meses", category: "FOOD_FRESH", supplier: "GastroImport Italia", supplierPhone: "+34622334455", currentStock: 2.1, unit: "kg", dailyConsumption: 0.8, daysRemaining: 2.6, leadTimeDays: 3, reorderPoint: 3, suggestedOrderQty: 10, unitPrice: 19.8, lastPurchasePrice: 18.2, purchaseCadenceDays: 7, status: "WARNING", recipeUnit: "g", purchaseToRecipeFactor: 1000, allergens: ["Leche"] },
  { id: "p3", name: "Aceite de Oliva Virgen Extra 5L", category: "FOOD_DRY", supplier: "Aceites del Sur", supplierPhone: "+34633445566", currentStock: 3, unit: "garrafas", dailyConsumption: 0.5, daysRemaining: 6, leadTimeDays: 2, reorderPoint: 2, suggestedOrderQty: 6, unitPrice: 38, lastPurchasePrice: 38, purchaseCadenceDays: 12, status: "HEALTHY", recipeUnit: "ml", purchaseToRecipeFactor: 5000, allergens: [] },
  { id: "p4", name: "Detergente Lavavajillas Industrial 20L", category: "CLEANING", supplier: "Químicos e Higiene Pro", supplierPhone: "+34644556677", currentStock: 1, unit: "garrafa", dailyConsumption: 0.15, daysRemaining: 6.6, leadTimeDays: 4, reorderPoint: 1.5, suggestedOrderQty: 3, unitPrice: 45, lastPurchasePrice: 45, purchaseCadenceDays: 15, status: "WARNING", recipeUnit: "ml", purchaseToRecipeFactor: 20000, allergens: [] },
  { id: "p5", name: "Servilletas Cocktail Cero Celulosa (Paq 500u)", category: "TABLEWARE", supplier: "Suministros Hosteleros BCN", supplierPhone: "+34655667788", currentStock: 12, unit: "paquetes", dailyConsumption: 1.8, daysRemaining: 6.6, leadTimeDays: 2, reorderPoint: 6, suggestedOrderQty: 20, unitPrice: 8.9, lastPurchasePrice: 8.9, purchaseCadenceDays: 10, status: "HEALTHY", recipeUnit: "ud", purchaseToRecipeFactor: 500, allergens: [] },
  { id: "p6", name: "Cajas Hamburguesa Kraft Compostable 100u", category: "PACKAGING", supplier: "EcoPack Takeaway", supplierPhone: "+34666778899", currentStock: 1.5, unit: "cajas", dailyConsumption: 0.8, daysRemaining: 1.8, leadTimeDays: 3, reorderPoint: 3, suggestedOrderQty: 10, unitPrice: 14.2, lastPurchasePrice: 14.2, purchaseCadenceDays: 7, status: "CRITICAL", recipeUnit: "ud", purchaseToRecipeFactor: 100, allergens: [] },
];

export const getSharedProduct = (productId: string) => SHARED_PRODUCT_CATALOG.find((product) => product.id === productId);
