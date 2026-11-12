// Tên tranh vẽ tay (public/assets). id trong game là tiếng Việt, tên file tiếng Anh.
const CROP_EN = {
  luami: 'wheat', carot: 'carrot', ngo: 'corn', khoaitay: 'potato', toi: 'garlic', rauthom: 'herbs', dualeo: 'cucumber',
  sa: 'lemongrass', bapcai: 'cabbage', dauphong: 'peanut', cachua: 'tomato', khoailang: 'sweet-potato', ot: 'chili',
  me: 'sesame', hanhtay: 'onion', dauxanh: 'mung-bean', mia: 'sugarcane', dautay: 'strawberry', gung: 'ginger',
  catim: 'eggplant', huongduong: 'sunflower', gao: 'rice', bongcai: 'cauliflower', bingo: 'pumpkin', tra: 'tea',
  thom: 'pineapple', bongvai: 'cotton', duahau: 'watermelon', nho: 'grape', caphe: 'coffee', cansa: 'cannabis',
  hoahong: 'rose', oliu: 'olive', nam: 'mushroom', cacao: 'cacao', vani: 'vanilla',
};
const TREE_PNG = new Set(['cam', 'tao', 'xoai', 'thanhlong', 'chuoi', 'chanh', 'dua', 'dao', 'anhdao', 'quame', 'coc', 'quabo', 'saurieng']);
const PRODUCT_PNG = { botmi: 'wheat-flour', botbap: 'corn-flour' };

// Sprite của một vật phẩm trong kho: cây trồng dùng tranh chín, sản phẩm chế biến dùng tranh sản phẩm.
export function itemSprite(id) {
  if (CROP_EN[id]) return `assets/crops-v3/${CROP_EN[id]}-ripe.png`;
  if (TREE_PNG.has(id)) return `assets/art/trees/${id}.png`;
  if (PRODUCT_PNG[id]) return `assets/products-v3/${PRODUCT_PNG[id]}.png`;
  return null;
}
export const hasCropArt = (id) => id in CROP_EN;
