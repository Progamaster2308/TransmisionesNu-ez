import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  createProduct,
  deleteProduct,
  getActiveBanner,
  getActiveRepairPromo,
  getDefaultAvailability,
  getDefaultBanner,
  getDefaultRepairPromo,
  getDefaultWorkShowcase,
  listAppointmentAvailability,
  listProducts,
  listWorkShowcase,
  resetLocalBanner,
  resetLocalRepairPromo,
  saveAdminBanner,
  saveAppointmentAvailability,
  saveRepairPromo,
  saveWorkShowcase,
  updateProduct
} from '../../shared/datastore/supabaseDataStore';
import { useToast } from '../providers/useToast';

import './AdminPanelPage.css';

const emptyProduct = {
  sku: '',
  nombre: '',
  marca: '',
  categoria: '',
  precio: '',
  precioOriginal: '',
  descuento: '',
  imagen: '',
  rating: 5,
  stock: '',
  envioGratis: true
};

function slotsToText(slots) {
  return Array.isArray(slots) ? slots.join(', ') : '';
}

function ensureThreeWorkItems(items) {
  const defaults = getDefaultWorkShowcase();
  return defaults.map((fallback) => {
    const saved = items?.find((item) => Number(item.slot) === Number(fallback.slot));
    return saved ? { ...fallback, ...saved } : fallback;
  });
}

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      reject(new Error('Selecciona una imagen válida'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 1200;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', .84));
      };
      image.onerror = () => reject(new Error('No se pudo leer la imagen'));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error('No se pudo cargar el archivo'));
    reader.readAsDataURL(file);
  });
}

export default function AdminPanelPage() {
  const [bannerForm, setBannerForm] = useState(() => getDefaultBanner());
  const [promoForm, setPromoForm] = useState(() => getDefaultRepairPromo());
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingProductId, setEditingProductId] = useState('');
  const [products, setProducts] = useState([]);
  const [workShowcase, setWorkShowcase] = useState(() => getDefaultWorkShowcase());
  const [availability, setAvailability] = useState(() => getDefaultAvailability());
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let mounted = true;

    (async () => {
      const [activeBanner, activePromo, productRows, availabilityRows, workRows] = await Promise.all([
        getActiveBanner(),
        getActiveRepairPromo(),
        listProducts().catch(() => []),
        listAppointmentAvailability(),
        listWorkShowcase(true)
      ]);

      if (mounted) {
        setBannerForm(activeBanner || getDefaultBanner());
        setPromoForm(activePromo || getDefaultRepairPromo());
        setProducts(productRows);
        setAvailability(availabilityRows);
        setWorkShowcase(ensureThreeWorkItems(workRows));
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const productCount = products.length;
  const enabledDays = useMemo(() => availability.filter((day) => day.enabled).length, [availability]);
  const visibleWorks = useMemo(() => workShowcase.filter((item) => item.enabled && item.titulo), [workShowcase]);

  const updateBannerField = (field) => (event) => {
    setBannerForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const updatePromoField = (field) => (event) => {
    setPromoForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const updateProductField = (field) => (event) => {
    const value = field === 'envioGratis' ? event.target.checked : event.target.value;
    setProductForm((current) => ({ ...current, [field]: value }));
  };

  const updateWorkField = (slot, field, value) => {
    setWorkShowcase((current) =>
      current.map((item, index) => (
        Number(item.slot ?? index + 1) === Number(slot) ? { ...item, [field]: value } : item
      ))
    );
  };

  const handleWorkImage = async (slot, file) => {
    if (!file) return;

    try {
      const imageData = await resizeImageFile(file);
      updateWorkField(slot, 'imagen', imageData);
      showToast('Foto cargada');
    } catch (error) {
      console.error(error);
      showToast(error?.message || 'No se pudo cargar la foto');
    }
  };

  const handleSaveBanner = async () => {
    setSaving(true);
    try {
      const saved = await saveAdminBanner(bannerForm);
      setBannerForm(saved);
      showToast('Banner actualizado');
    } catch (error) {
      console.error(error);
      showToast('No se pudo guardar el banner');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePromo = async () => {
    setSaving(true);
    try {
      const saved = await saveRepairPromo(promoForm);
      setPromoForm(saved);
      showToast('Promoción actualizada');
    } catch (error) {
      console.error(error);
      showToast('No se pudo guardar la promoción');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProduct = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = editingProductId
        ? await updateProduct(editingProductId, productForm)
        : await createProduct(productForm);

      setProducts((current) => {
        if (editingProductId) return current.map((product) => (product.id === editingProductId ? saved : product));
        return [saved, ...current];
      });
      setProductForm(emptyProduct);
      setEditingProductId('');
      showToast(editingProductId ? 'Producto actualizado' : 'Producto agregado');
    } catch (error) {
      console.error(error);
      showToast(error?.message || 'No se pudo guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const startEditProduct = (product) => {
    setEditingProductId(product.id);
    setProductForm({ ...emptyProduct, ...product });
  };

  const handleDeleteProduct = async (productId) => {
    setSaving(true);
    try {
      await deleteProduct(productId);
      setProducts((current) => current.filter((product) => product.id !== productId));
      showToast('Producto eliminado');
    } catch (error) {
      console.error(error);
      showToast('No se pudo eliminar el producto');
    } finally {
      setSaving(false);
    }
  };

  const updateAvailability = (weekday, field, value) => {
    setAvailability((current) =>
      current.map((day) => {
        if (Number(day.weekday) !== Number(weekday)) return day;
        if (field === 'slots') {
          return {
            ...day,
            slots: value.split(',').map((slot) => slot.trim()).filter(Boolean)
          };
        }
        return { ...day, [field]: value };
      })
    );
  };

  const handleSaveAvailability = async () => {
    setSaving(true);
    try {
      const saved = await saveAppointmentAvailability(availability);
      setAvailability(saved);
      showToast('Disponibilidad actualizada');
    } catch (error) {
      console.error(error);
      showToast('No se pudo guardar la disponibilidad');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWorkShowcase = async () => {
    setSaving(true);
    try {
      const saved = await saveWorkShowcase(workShowcase);
      setWorkShowcase(saved);
      showToast('Trabajos actualizados');
    } catch (error) {
      console.error(error);
      showToast(error?.message || 'No se pudieron guardar los trabajos');
    } finally {
      setSaving(false);
    }
  };

  const previewStyle = bannerForm.imagen ? { '--admin-preview-image': `url(${bannerForm.imagen})` } : undefined;
  const splashPreviewStyle = bannerForm.splash_image ? { '--admin-splash-image': `url(${bannerForm.splash_image})` } : undefined;

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <div>
          <p className="admin-kicker">Panel administrativo</p>
          <h1>Control de Transmisiones Núñez</h1>
          <p>Administra banners, promociones, productos, pedidos y horarios disponibles para citas.</p>
        </div>
        <div className="admin-actions">
          <Link className="admin-linkBtn" to="/admin/ordenes">Pedidos</Link>
          <Link className="admin-linkBtn" to="/admin/citas">Citas</Link>
          <Link className="admin-linkBtn admin-linkBtn--dark" to="/catalogo">Ver catálogo</Link>
        </div>
      </section>

      <section className="adminMetrics">
        <div><strong>{productCount}</strong><span>Productos</span></div>
        <div><strong>{enabledDays}</strong><span>Días activos</span></div>
        <div><strong>{visibleWorks.length}</strong><span>Trabajos</span></div>
      </section>

      <section className="admin-grid">
        <div className="admin-card">
          <div className="admin-cardHeader">
            <p className="admin-kicker">Banner</p>
            <h2>Contenido del inicio</h2>
          </div>

          <label className="admin-field"><span>Título</span><input value={bannerForm.titulo || ''} onChange={updateBannerField('titulo')} maxLength={120} /></label>
          <label className="admin-field"><span>Subtítulo</span><input value={bannerForm.subtitulo || ''} onChange={updateBannerField('subtitulo')} maxLength={180} /></label>
          <label className="admin-field"><span>Descripción</span><textarea value={bannerForm.descripcion || ''} onChange={updateBannerField('descripcion')} rows={4} maxLength={320} /></label>
          <div className="admin-fieldRow">
            <label className="admin-field"><span>Texto del botón</span><input value={bannerForm.cta_label || ''} onChange={updateBannerField('cta_label')} maxLength={40} /></label>
            <label className="admin-field"><span>Ruta del botón</span><input value={bannerForm.cta_link || ''} onChange={updateBannerField('cta_link')} maxLength={120} /></label>
          </div>
          <label className="admin-field"><span>Imagen de fondo</span><input value={bannerForm.imagen || ''} onChange={updateBannerField('imagen')} placeholder="https://..." maxLength={500} /></label>
          <label className="admin-field"><span>Imagen del splash inicial</span><input value={bannerForm.splash_image || ''} onChange={updateBannerField('splash_image')} placeholder="https://..." maxLength={500} /></label>

          <div className="admin-formActions">
            <button className="admin-saveBtn" onClick={handleSaveBanner} disabled={saving}>{saving ? 'Guardando...' : 'Guardar banner'}</button>
            <button className="admin-resetBtn" onClick={() => setBannerForm(resetLocalBanner())} disabled={saving}>Restablecer</button>
          </div>
        </div>

        <div className="admin-previewCard">
          <p className="admin-kicker">Vista previa</p>
          <div className="admin-splashPreview" style={splashPreviewStyle}>
            <span>Inicio</span>
            <strong>Transmisiones Núñez</strong>
          </div>
          <div className="admin-bannerPreview" style={previewStyle}>
            <span>Transmisiones Núñez</span>
            <h3>{bannerForm.titulo}</h3>
            <p>{bannerForm.subtitulo}</p>
            <button>{bannerForm.cta_label || 'Explorar catálogo'}</button>
          </div>
        </div>
      </section>

      <section className="admin-grid admin-grid--single">
        <div className="admin-card">
          <div className="admin-cardHeader">
            <p className="admin-kicker">Promoción</p>
            <h2>Reparación de transmisiones</h2>
          </div>
          <label className="admin-field"><span>Título</span><input value={promoForm.titulo || ''} onChange={updatePromoField('titulo')} maxLength={120} /></label>
          <label className="admin-field"><span>Subtítulo</span><input value={promoForm.subtitulo || ''} onChange={updatePromoField('subtitulo')} maxLength={180} /></label>
          <label className="admin-field"><span>Descripción</span><textarea value={promoForm.descripcion || ''} onChange={updatePromoField('descripcion')} rows={3} maxLength={320} /></label>
          <div className="admin-fieldRow">
            <label className="admin-field"><span>Texto del botón</span><input value={promoForm.cta_label || ''} onChange={updatePromoField('cta_label')} maxLength={40} /></label>
            <label className="admin-field"><span>Ruta del botón</span><input value={promoForm.cta_link || ''} onChange={updatePromoField('cta_link')} maxLength={120} /></label>
          </div>
          <label className="admin-field"><span>Imagen promocional</span><input value={promoForm.imagen || ''} onChange={updatePromoField('imagen')} placeholder="https://..." maxLength={500} /></label>
          <div className="admin-formActions">
            <button className="admin-saveBtn" onClick={handleSavePromo} disabled={saving}>Guardar promoción</button>
            <button className="admin-resetBtn" onClick={() => setPromoForm(resetLocalRepairPromo())} disabled={saving}>Restablecer</button>
          </div>
        </div>
      </section>

      <section className="admin-grid admin-grid--single">
        <div className="admin-card">
          <div className="admin-cardHeader">
            <p className="admin-kicker">Trabajos</p>
            <h2>Reparaciones y ventas realizadas</h2>
          </div>

          <div className="adminWorkGrid">
            {workShowcase.map((item, index) => {
              const slot = item.slot ?? index + 1;

              return (
                <article className="adminWorkEditor" key={slot}>
                  <div className="adminWorkImage">
                    {item.imagen ? <img src={item.imagen} alt={item.titulo || `Trabajo ${slot}`} /> : <span>Foto del trabajo</span>}
                  </div>
                  <label className="admin-field">
                    <span>Título</span>
                    <input value={item.titulo || ''} onChange={(event) => updateWorkField(slot, 'titulo', event.target.value)} maxLength={100} />
                  </label>
                  <label className="admin-field">
                    <span>Descripción</span>
                    <textarea value={item.descripcion || ''} onChange={(event) => updateWorkField(slot, 'descripcion', event.target.value)} rows={3} maxLength={260} />
                  </label>
                  <label className="admin-field">
                    <span>Subir foto desde dispositivo</span>
                    <input type="file" accept="image/*" onChange={(event) => handleWorkImage(slot, event.target.files?.[0])} />
                  </label>
                  <label className="admin-check">
                    <input type="checkbox" checked={Boolean(item.enabled)} onChange={(event) => updateWorkField(slot, 'enabled', event.target.checked)} />
                    Mostrar en inicio
                  </label>
                </article>
              );
            })}
          </div>

          <div className="admin-formActions">
            <button className="admin-saveBtn" onClick={handleSaveWorkShowcase} disabled={saving}>
              Guardar trabajos
            </button>
          </div>
        </div>
      </section>

      <section className="admin-grid admin-grid--single">
        <div className="admin-card">
          <div className="admin-cardHeader">
            <p className="admin-kicker">Catálogo</p>
            <h2>{editingProductId ? 'Editar producto' : 'Agregar producto'}</h2>
          </div>

          <form className="adminProductForm" onSubmit={handleSaveProduct}>
            <label className="admin-field"><span>SKU</span><input value={productForm.sku} onChange={updateProductField('sku')} required /></label>
            <label className="admin-field"><span>Nombre</span><input value={productForm.nombre} onChange={updateProductField('nombre')} required /></label>
            <label className="admin-field"><span>Marca</span><input value={productForm.marca} onChange={updateProductField('marca')} required /></label>
            <label className="admin-field"><span>Categoría</span><input value={productForm.categoria} onChange={updateProductField('categoria')} required /></label>
            <label className="admin-field"><span>Precio</span><input type="number" value={productForm.precio} onChange={updateProductField('precio')} required /></label>
            <label className="admin-field"><span>Precio original</span><input type="number" value={productForm.precioOriginal || ''} onChange={updateProductField('precioOriginal')} /></label>
            <label className="admin-field"><span>Descuento</span><input value={productForm.descuento || ''} onChange={updateProductField('descuento')} /></label>
            <label className="admin-field"><span>Stock</span><input type="number" value={productForm.stock} onChange={updateProductField('stock')} required /></label>
            <label className="admin-field admin-field--wide"><span>Imagen</span><input value={productForm.imagen || ''} onChange={updateProductField('imagen')} placeholder="https://..." /></label>
            <label className="admin-check"><input type="checkbox" checked={Boolean(productForm.envioGratis)} onChange={updateProductField('envioGratis')} /> Envío gratis</label>
            <div className="admin-formActions admin-field--wide">
              <button className="admin-saveBtn" type="submit" disabled={saving}>{editingProductId ? 'Actualizar producto' : 'Agregar producto'}</button>
              {editingProductId && <button className="admin-resetBtn" type="button" onClick={() => { setEditingProductId(''); setProductForm(emptyProduct); }}>Cancelar edición</button>}
            </div>
          </form>

          <div className="adminProductList">
            {products.map((product) => (
              <article key={product.id} className="adminProductRow">
                <img src={product.imagen || '/favicon.svg'} alt={product.nombre} />
                <div>
                  <strong>{product.nombre}</strong>
                  <span>{product.sku} - {product.categoria} - Stock {product.stock}</span>
                </div>
                <button type="button" className="admin-resetBtn" onClick={() => startEditProduct(product)}>Editar</button>
                <button type="button" className="admin-resetBtn admin-resetBtn--danger" onClick={() => handleDeleteProduct(product.id)}>Eliminar</button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-grid admin-grid--single">
        <div className="admin-card">
          <div className="admin-cardHeader">
            <p className="admin-kicker">Agenda</p>
            <h2>Días y horas disponibles</h2>
          </div>
          <div className="availabilityGrid">
            {availability.map((day) => (
              <div className="availabilityDay" key={day.weekday}>
                <label className="admin-check">
                  <input type="checkbox" checked={Boolean(day.enabled)} onChange={(event) => updateAvailability(day.weekday, 'enabled', event.target.checked)} />
                  {day.day_label}
                </label>
                <input value={slotsToText(day.slots)} onChange={(event) => updateAvailability(day.weekday, 'slots', event.target.value)} placeholder="09:00, 10:00, 14:00" />
              </div>
            ))}
          </div>
          <div className="admin-formActions">
            <button className="admin-saveBtn" onClick={handleSaveAvailability} disabled={saving}>Guardar disponibilidad</button>
          </div>
        </div>
      </section>
    </main>
  );
}
