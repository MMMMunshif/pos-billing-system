/** Display shop name; supports legacy category/supplierName fields. */
export const getProductShop = (product) =>
  product?.shop?.trim() || product?.supplierName?.trim() || product?.category?.trim() || '';

export const getProductBrand = (product) => product?.brand?.trim() || '';

export const getPurchaseShop = (purchase) =>
  purchase?.shop?.trim() || purchase?.supplierName?.trim() || '';
