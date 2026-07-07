import React, { useState } from 'react';
import { X, Star, MapPin, Grid, MessageSquare, Image, ShieldCheck, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ProviderPublicProfileModalProps {
  provider: any;
  reviews: any[];
  gallery: any[];
  onClose: () => void;
  onAddToCart: (service: any) => void;
}

export const ProviderPublicProfileModal: React.FC<ProviderPublicProfileModalProps> = ({
  provider,
  reviews,
  gallery,
  onClose,
  onAddToCart
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'gallery' | 'reviews'>('info');
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  const ratingAvg = provider.rating || 4.8;
  const isCompany = provider.providerConfig?.entityType === 'company' || provider.id.startsWith('company');

  // Determinar si la URL es un video
  const isVideoFile = (url: string) => {
    return url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.mov') || url.includes('video') || url.startsWith('blob:') && url.includes('video');
  };

  // Controles de navegación de la pasarela
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeLightboxIndex === null || gallery.length === 0) return;
    setActiveLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : gallery.length - 1));
    setZoomLevel(1.0); // Reset zoom al cambiar de imagen
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeLightboxIndex === null || gallery.length === 0) return;
    setActiveLightboxIndex((prev) => (prev !== null && prev < gallery.length - 1 ? prev + 1 : 0));
    setZoomLevel(1.0); // Reset zoom al cambiar de imagen
  };

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel((prev) => Math.max(prev - 0.25, 1.0));
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomLevel(1.0);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card provider-public-profile-card">
        <div className="modal-glow" />
        
        {/* Header con botón cerrar */}
        <div className="modal-header-row">
          <div className="provider-header-main">
            <img src={provider.avatar} alt={provider.title} className="provider-profile-avatar" />
            <div className="provider-profile-meta">
              <div className="flex-items gap-sm">
                <h2 className="provider-profile-title">{provider.title}</h2>
                <span className={`entity-type-badge ${isCompany ? 'company' : 'individual'}`}>
                  {isCompany ? '🏢 Empresa' : '👤 Profesional'}
                </span>
              </div>
              <div className="flex-items gap-sm text-muted" style={{ fontSize: '12px', marginTop: '4px' }}>
                <MapPin size={12} />
                <span>{provider.location || 'Palermo, CABA'}</span>
                <span>•</span>
                <span>📍 a {provider.distanceKm} km</span>
              </div>
            </div>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Mini Stats Row */}
        <div className="provider-profile-stats-row">
          <div className="profile-stat-box">
            <span className="stat-value flex-items gap-xs">
              <Star size={14} className="star-active" /> {ratingAvg}
            </span>
            <span className="stat-label">{reviews.length} Calificaciones</span>
          </div>
          <div className="profile-stat-box">
            <span className="stat-value">${provider.price.toLocaleString()}</span>
            <span className="stat-label">Tarifa por Hora</span>
          </div>
          <div className="profile-stat-box">
            <span className="stat-value text-accent">98%</span>
            <span className="stat-label">Éxito de Eventos</span>
          </div>
        </div>

        {/* Tabs de Navegación del Perfil */}
        <div className="profile-sub-tabs">
          <button 
            className={`profile-sub-tab ${activeSubTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('info')}
          >
            <Grid size={14} />
            <span>Servicios</span>
          </button>
          <button 
            className={`profile-sub-tab ${activeSubTab === 'gallery' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('gallery')}
          >
            <Image size={14} />
            <span>Galería ({gallery.length})</span>
          </button>
          <button 
            className={`profile-sub-tab ${activeSubTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('reviews')}
          >
            <MessageSquare size={14} />
            <span>Opiniones ({reviews.length})</span>
          </button>
        </div>

        {/* Cuerpo del Perfil */}
        <div className="profile-sub-body">
          {/* TAB 1: Servicios e Info */}
          {activeSubTab === 'info' && (
            <div className="profile-services-list flex-column gap-md">
              <div className="profile-bio-box">
                <span className="section-mini-label">SOBRE NOSOTROS</span>
                <p className="profile-bio-text">{provider.description}</p>
                <div className="verified-badge-row">
                  <ShieldCheck size={14} className="text-emerald" />
                  <span>Proveedor verificado por la garantía EventGo Pay</span>
                </div>
              </div>

              <div className="services-offer-container">
                <span className="section-mini-label">SERVICIOS DISPONIBLES</span>
                <div className="service-offer-card">
                  <div className="service-offer-info">
                    <h4>{provider.title} (Servicio Base)</h4>
                    <p>Prestación profesional estándar por hora de duración contratada.</p>
                    <span className="service-offer-price">${provider.price.toLocaleString()} / hr</span>
                  </div>
                  <button 
                    className="btn-hire-service"
                    onClick={() => {
                      onAddToCart(provider);
                      onClose();
                    }}
                  >
                    Contratar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Galería de fotos/videos */}
          {activeSubTab === 'gallery' && (
            <div className="profile-gallery-grid">
              {gallery.length === 0 ? (
                <div className="no-media-box">
                  <Image size={24} />
                  <span>No hay archivos multimedia cargados aún.</span>
                </div>
              ) : (
                gallery.map((media, index) => (
                  <div 
                    key={media.id} 
                    className="gallery-media-item"
                    onClick={() => {
                      setActiveLightboxIndex(index);
                      setZoomLevel(1.0);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {isVideoFile(media.url) ? (
                      <div className="gallery-video-preview-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <video src={media.url} className="gallery-media-img" muted playsInline />
                        <div className="video-play-badge">▶ Video</div>
                      </div>
                    ) : (
                      <img src={media.url} alt={media.title} className="gallery-media-img" />
                    )}
                    <div className="gallery-media-hover-overlay">
                      <span>{media.title}</span>
                      <span className="gallery-zoom-prompt" style={{ fontSize: '10px', marginTop: '6px', color: '#c084fc' }}>🔎 Ver en Pantalla Completa</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: Comentarios y Valoraciones */}
          {activeSubTab === 'reviews' && (
            <div className="profile-reviews-list flex-column gap-sm">
              {reviews.length === 0 ? (
                <div className="no-media-box">
                  <Star size={24} />
                  <span>Este proveedor no tiene valoraciones todavía. ¡Sé el primero en contratar!</span>
                </div>
              ) : (
                reviews.map((rev, index) => (
                  <div key={index} className="review-comment-row-card">
                    <div className="review-comment-header">
                      <span className="review-comment-author">{rev.name}</span>
                      <div className="review-comment-rating">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            size={12} 
                            className={star <= rev.rating ? 'star-active-fill' : 'star-inactive-fill'} 
                          />
                        ))}
                      </div>
                      <span className="review-comment-date">{rev.date}</span>
                    </div>
                    <p className="review-comment-text">"{rev.comment}"</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* PASARELA DE FOTOS Y VIDEOS CON CONTROLES DE ZOOM (LIGHTBOX DIALOG) */}
      {activeLightboxIndex !== null && gallery[activeLightboxIndex] && (
        <div 
          className="lightbox-overlay"
          onClick={() => setActiveLightboxIndex(null)}
        >
          {/* Contenedor central */}
          <div className="lightbox-content-card" onClick={(e) => e.stopPropagation()}>
            
            {/* Cabecera del Lightbox */}
            <div className="lightbox-header flex-items justify-between">
              <span className="lightbox-title-text">
                {gallery[activeLightboxIndex].title} ({activeLightboxIndex + 1} de {gallery.length})
              </span>
              
              {/* Controles de Zoom */}
              {!isVideoFile(gallery[activeLightboxIndex].url) && (
                <div className="lightbox-zoom-controls flex-items gap-sm">
                  <button className="btn-lightbox-action" onClick={handleZoomOut} title="Zoom Out">
                    <ZoomOut size={16} />
                  </button>
                  <span className="zoom-value-label">{Math.round(zoomLevel * 100)}%</span>
                  <button className="btn-lightbox-action" onClick={handleZoomIn} title="Zoom In">
                    <ZoomIn size={16} />
                  </button>
                  {zoomLevel > 1.0 && (
                    <button className="btn-lightbox-action" onClick={handleResetZoom} title="Restablecer">
                      <RotateCcw size={14} />
                    </button>
                  )}
                </div>
              )}

              <button className="btn-close-lightbox" onClick={() => setActiveLightboxIndex(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo del Visualizador */}
            <div className="lightbox-body">
              {/* Botón Navegación Izquierda */}
              <button className="btn-lightbox-nav prev" onClick={handlePrev}>
                <ChevronLeft size={24} />
              </button>

              {/* Contenedor del archivo */}
              <div className="lightbox-viewport">
                {isVideoFile(gallery[activeLightboxIndex].url) ? (
                  <video 
                    src={gallery[activeLightboxIndex].url} 
                    className="lightbox-video-element" 
                    controls 
                    autoPlay 
                    style={{ transform: `scale(${zoomLevel})` }}
                  />
                ) : (
                  <img 
                    src={gallery[activeLightboxIndex].url} 
                    alt={gallery[activeLightboxIndex].title} 
                    className="lightbox-image-element"
                    style={{ transform: `scale(${zoomLevel})` }}
                  />
                )}
              </div>

              {/* Botón Navegación Derecha */}
              <button className="btn-lightbox-nav next" onClick={handleNext}>
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
