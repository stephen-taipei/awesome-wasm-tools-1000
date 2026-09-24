import { ImageConverterBase } from '../../../utils/ImageConverterBase.js';
class PngToJpgConverter extends ImageConverterBase {
  constructor() { super({inputFormats:['image/png'],outputFormat:'image/jpeg',outputExtension:'jpg',fillBackground:'#FFFFFF'}); }
}
document.addEventListener('DOMContentLoaded',()=>{window.converter=new PngToJpgConverter();});
export default PngToJpgConverter;
