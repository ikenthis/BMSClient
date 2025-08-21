// PDFViewer.tsx - Componente mejorado para visualización de PDF
import React, { useState, useEffect } from 'react';
import { Document, pdfjs } from 'react-pdf';
import PDFPage from './PDFPage';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';
import '.styles/pdfviewer.css'; // Asegúrate de tener estilos CSS para el componente

// Configurar el worker de PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  file: string;
  onLoadSuccess?: (pdf: any) => void;
  onLoadError?: (error: Error) => void;
  options?: {
    cMapUrl?: string;
    cMapPacked?: boolean;
  };
  children?: React.ReactNode;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  file,
  onLoadSuccess,
  onLoadError,
  options = {},
  children
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [pdfLoaded, setPdfLoaded] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Actualizar el ancho del contenedor cuando se carga o redimensiona
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    
    return () => window.removeEventListener('resize', updateWidth);
  }, [pdfLoaded]);

  const handleDocumentLoadSuccess = (pdf: any) => {
    setNumPages(pdf.numPages);
    setPdfLoaded(true);
    setError(null);
    
    if (onLoadSuccess) {
      onLoadSuccess(pdf);
    }
  };

  const handleDocumentLoadError = (err: Error) => {
    console.error('Error al cargar el PDF:', err);
    setError(err);
    setPdfLoaded(false);
    
    if (onLoadError) {
      onLoadError(err);
    }
  };

  const goToPreviousPage = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
  };

  const goToNextPage = () => {
    if (numPages && pageNumber < numPages) {
      setPageNumber(pageNumber + 1);
    }
  };

  const zoomIn = () => {
    setScale(scale => Math.min(scale + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale(scale => Math.max(scale - 0.2, 0.5));
  };

  const downloadPDF = () => {
    const link = document.createElement('a');
    link.href = file;
    link.download = file.split('/').pop() || 'documento.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pdf-viewer" ref={containerRef}>
      {error ? (
        <div className="pdf-error">
          <p>Error al cargar el documento PDF.</p>
          {children}
        </div>
      ) : (
        <>
          <Document
            file={file}
            onLoadSuccess={handleDocumentLoadSuccess}
            onLoadError={handleDocumentLoadError}
            options={{
              cMapUrl: options.cMapUrl || 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/cmaps/',
              cMapPacked: options.cMapPacked !== undefined ? options.cMapPacked : true,
            }}
            loading={<div className="pdf-loading">Cargando documento...</div>}
            error={<div className="pdf-error">Error al cargar el documento</div>}
          >
            {pdfLoaded && (
              <PDFPage 
                pageNumber={pageNumber} 
                scale={scale} 
                width={containerWidth * 0.9} 
              />
            )}
          </Document>
          
          {pdfLoaded && numPages && (
            <div className="pdf-controls">
              <div className="pdf-navigation">
                <button 
                  className="pdf-nav-button" 
                  onClick={goToPreviousPage} 
                  disabled={pageNumber <= 1}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="pdf-page-info">
                  {pageNumber} de {numPages}
                </span>
                <button 
                  className="pdf-nav-button" 
                  onClick={goToNextPage} 
                  disabled={!numPages || pageNumber >= numPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              
              <div className="pdf-zoom-controls">
                <button 
                  className="pdf-zoom-button" 
                  onClick={zoomOut} 
                  disabled={scale <= 0.5}
                >
                  <ZoomOut size={16} />
                </button>
                <span className="pdf-zoom-info">
                  {Math.round(scale * 100)}%
                </span>
                <button 
                  className="pdf-zoom-button" 
                  onClick={zoomIn} 
                  disabled={scale >= 3.0}
                >
                  <ZoomIn size={16} />
                </button>
              </div>
              
              <button 
                className="pdf-download-button" 
                onClick={downloadPDF}
                title="Descargar PDF"
              >
                <Download size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PDFViewer;