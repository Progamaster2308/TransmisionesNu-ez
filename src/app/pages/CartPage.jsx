import { Link, useNavigate } from 'react-router-dom';

import { useCart } from '../providers/useCart';
import { useToast } from '../providers/useToast';

import './CartPage.css';

export default function CartPage() {
  const { items, removeItem, clearCart, updateQty } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleContinue = async () => {
    if (items.length === 0) {
      showToast('Tu pedido está vacío');
      return;
    }

    navigate('/checkout');
  };

  return (
    <main className="cartWrap">
      <div className="cartPanel">
        <div className="cartHeader">
          <div>
            <h2>Pedido</h2>
            <p>Revisa las refacciones solicitadas antes de generar la orden.</p>
          </div>
          <div className="cartHeaderActions">
            <Link to="/catalogo" className="nu-linkBtn">Seguir consultando</Link>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="cartEmpty">
            <div className="cartEmptyText">Aún no agregaste refacciones al pedido.</div>
            <Link to="/catalogo" className="nu-linkBtn">Ir al catálogo</Link>
          </div>
        ) : (
          <div className="cartGrid">
            <section className="cartLeft">
              <div className="cartSummary">{items.length} productos en consulta</div>

              <div className="cartList">
                {items.map((it) => (
                  <div key={it.id} className="cartItem">
                    <img
                      className="cartItemImg"
                      alt={it.nombre}
                      src={it.imagen || '/favicon.svg'}
                      onError={(event) => {
                        event.currentTarget.src = '/favicon.svg';
                      }}
                    />

                    <div className="cartItemMain">
                      <div className="cartItemTop">
                        <div>
                          <div className="cartItemSku">{it.sku}</div>
                          <div className="cartItemName">{it.nombre}</div>
                          <div className="cartItemAvailability">Disponible: {it.stock ?? 0}</div>
                        </div>
                        <button type="button" className="cartRemove" onClick={() => removeItem(it.id)}>
                          Quitar
                        </button>
                      </div>

                      <div className="cartItemBottom">
                        <div className="cartItemNote">Cantidad solicitada</div>

                        <div className="qtyRow">
                          <button className="qtyBtn" onClick={() => updateQty(it.id, it.cantidad - 1)} disabled={it.cantidad <= 1}>-</button>
                          <span className="qtyVal">{it.cantidad}</span>
                          <button className="qtyBtn" onClick={() => updateQty(it.id, it.cantidad + 1)} disabled={it.cantidad >= Number(it.stock ?? 0)}>
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                className="cartClear"
                onClick={() => {
                  clearCart();
                  showToast('Pedido vaciado');
                }}
              >
                Vaciar pedido
              </button>
            </section>

            <aside className="cartRight">
              <div className="cartTotalBox">
                <div className="cartTotalTitle">Orden de consulta</div>
                <div className="cartTotalHint">
                  Al generar la orden, el vendedor recibe el detalle para confirmar disponibilidad y seguimiento.
                </div>

                <button className="cartPay" onClick={handleContinue}>Generar orden</button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
