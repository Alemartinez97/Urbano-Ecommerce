import React, { useState } from 'react';
import { X, Folder, Image, Video, Search, ChevronRight, HardDrive } from 'lucide-react';

interface DriveFile {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  size: string;
  date: string;
}

interface GoogleDrivePickerModalProps {
  onClose: () => void;
  onSelectFile: (url: string, title: string, type: 'image' | 'video') => void;
}

const DRIVE_MOCK_FILES: DriveFile[] = [
  {
    id: 'df-1',
    name: 'Salon_Banquete_Gala.jpg',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=600&q=80',
    size: '2.4 MB',
    date: 'Ayer, 18:24 hs'
  },
  {
    id: 'df-2',
    name: 'DJ_Luces_Estroboscopicas.jpg',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1516873240891-4bf014598ab4?auto=format&fit=crop&w=600&q=80',
    size: '1.8 MB',
    date: 'Hace 3 días'
  },
  {
    id: 'df-3',
    name: 'Plato_Gourmet_Entrada.jpg',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    size: '3.1 MB',
    date: 'Hace 1 semana'
  },
  {
    id: 'df-4',
    name: 'Fotografo_Cobertura_Boda.jpg',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1486262716219-ce6c5ed43d3e?auto=format&fit=crop&w=600&q=80',
    size: '4.2 MB',
    date: 'Hace 2 semanas'
  },
  {
    id: 'df-5',
    name: 'Servicio_Barman_Cocteles.jpg',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=600&q=80',
    size: '2.9 MB',
    date: 'Hace 1 mes'
  }
];

export const GoogleDrivePickerModal: React.FC<GoogleDrivePickerModalProps> = ({
  onClose,
  onSelectFile
}) => {
  const [search, setSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);

  const filteredFiles = DRIVE_MOCK_FILES.filter(file => 
    file.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirm = () => {
    if (!selectedFile) return;
    onSelectFile(selectedFile.url, selectedFile.name.split('.')[0], selectedFile.type);
    onClose();
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div className="modal-card google-drive-picker-card">
        {/* Glow de Google */}
        <div className="google-drive-glow" />

        {/* Cabecera Picker */}
        <div className="google-drive-header">
          <div className="flex-items gap-sm">
            <svg width="22" height="22" viewBox="0 0 24 24" className="drive-logo-icon">
              <path fill="#FFC107" d="M18.15 15.65H23L18.15 7.3H13.3L18.15 15.65z"/>
              <path fill="#2196F3" d="M9.85 15.65h13L18 7.3H4.85l5 8.35z" opacity=".2"/>
              <path fill="#4CAF50" d="M9.85 15.65H1.2L6 7.3h8.65l-4.8 8.35z"/>
              <path fill="#2196F3" d="M6 7.3L1.2 15.65l4.85 8.35h4.8l-4.85-8.35L14.65 7.3H6z"/>
            </svg>
            <h3 className="drive-picker-title">Seleccionar Archivo de Google Drive</h3>
          </div>
          <button className="btn-close-modal" onClick={onClose} style={{ border: 'none' }}>
            <X size={18} />
          </button>
        </div>

        {/* Barra de búsqueda & Navegación */}
        <div className="google-drive-nav-row flex-items gap-sm">
          <div className="drive-search-input-wrap">
            <Search size={14} className="drive-search-icon" />
            <input 
              type="text" 
              placeholder="Buscar en mi unidad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="drive-search-field"
            />
          </div>
          <span className="drive-path-text flex-items gap-xs">
            <HardDrive size={12} />
            Mi Unidad <ChevronRight size={10} /> Portfolio
          </span>
        </div>

        {/* Lista de Carpetas Rápidas */}
        <div className="drive-quick-folders">
          <div className="drive-folder-item flex-items gap-xs">
            <Folder size={14} className="folder-icon-color" />
            <span>Mis Eventos</span>
          </div>
          <div className="drive-folder-item flex-items gap-xs active">
            <Folder size={14} className="folder-icon-color" />
            <span>Portfolio</span>
          </div>
          <div className="drive-folder-item flex-items gap-xs">
            <Folder size={14} className="folder-icon-color" />
            <span>Videos Promocionales</span>
          </div>
        </div>

        {/* Archivos Listados */}
        <div className="google-drive-files-list">
          {filteredFiles.map((file) => {
            const isSelected = selectedFile?.id === file.id;
            return (
              <div 
                key={file.id} 
                className={`drive-file-row ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedFile(file)}
              >
                <div className="flex-items gap-sm">
                  {file.type === 'image' ? (
                    <Image size={16} className="file-icon-img" />
                  ) : (
                    <Video size={16} className="file-icon-vid" />
                  )}
                  <div className="drive-file-info">
                    <span className="drive-file-name">{file.name}</span>
                    <span className="drive-file-meta">{file.size} • Modificado {file.date}</span>
                  </div>
                </div>
                {/* Previsualización miniatura */}
                <img src={file.url} alt={file.name} className="drive-thumbnail" />
              </div>
            );
          })}
        </div>

        {/* Footer del Picker */}
        <div className="google-drive-footer flex-items justify-between">
          <span className="selected-file-label">
            {selectedFile ? `Seleccionado: ${selectedFile.name}` : 'Ningún archivo seleccionado'}
          </span>
          <div className="flex-items gap-sm">
            <button className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button 
              className="btn-confirm google-drive-confirm-btn"
              disabled={!selectedFile}
              onClick={handleConfirm}
            >
              Seleccionar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
