// PDFPage.tsx - Componente para visualizar páginas del PDF
import React, { useState } from 'react';
import { Page } from 'react-pdf';

interface PDFPageProps {
  pageNumber: number;
  scale?: number;
  onLoadSuccess?: (page: any) => void;
  width?: number;
}

const PDFPage: React.FC<PDFPageProps> = ({
  pageNumber, 
  scale = 1.0,
  onLoadSuccess,
  width
}) => {
  const [pageLoaded, setPageLoaded] = useState(false);

  const handleLoadSuccess = (page: any) => {
    setPageLoaded(true);
    if (onLoadSuccess) {
      onLoadSuccess(page);
    }
  };

  return (
    <div className="pdf-page-wrapper">
      {!pageLoaded && (
        <div className="pdf-page-loading">
          Cargando página {pageNumber}...
        </div>
      )}
      <Page
        className={`pdf-page ${pageLoaded ? 'loaded' : ''}`}
        pageNumber={pageNumber}
        scale={scale}
        loading={
          <div className="pdf-page-loading">
            Cargando página {pageNumber}...
          </div>
        }
        onLoadSuccess={handleLoadSuccess}
        width={width}
        renderTextLayer={false}
        renderAnnotationLayer={false}
      />
    </div>
  );
};

export default PDFPage;