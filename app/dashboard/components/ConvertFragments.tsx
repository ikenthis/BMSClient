"use client";

import React, { useState, useRef } from "react";
import * as FRAGS from "@thatopen/fragments";

const IFCFragmentsConverter: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>("Upload an IFC file to begin");
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>("");
  const [fragmentBytes, setFragmentBytes] = useState<ArrayBuffer | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.name.toLowerCase().endsWith('.ifc')) {
      setStatus("Please upload an IFC file");
      return;
    }

    setFileName(file.name);
    setStatus(`Selected file: ${file.name}`);
    setFragmentBytes(null);
  };

  const convertIFC = async () => {
    if (!fileInputRef.current?.files?.length) {
      setStatus("No file selected");
      return;
    }
    
    const file = fileInputRef.current.files[0];
    setIsConverting(true);
    setStatus("Converting IFC to Fragments...");
    setProgress(0);
    
    try {
      // Initialize the serializer
      const serializer = new FRAGS.IfcImporter();
      serializer.wasm = { absolute: true, path: "https://unpkg.com/web-ifc@0.0.68/" };
      
      // Load and convert the file
      const arrayBuffer = await file.arrayBuffer();
      setProgress(20);
      
      const ifcBytes = new Uint8Array(arrayBuffer);
      setProgress(40);
      
      // Set up progress tracking
      serializer.onProgress = (progress) => {
        // Map the conversion progress (0-1) to overall progress (40-90)
        setProgress(40 + Math.round(progress * 50));
      };
      
      const bytes = await serializer.process({ bytes: ifcBytes });
      setProgress(100);
      
      setFragmentBytes(bytes);
      setStatus(`Conversion complete! ${file.name} is ready to download`);
    } catch (error) {
      console.error("Error converting IFC:", error);
      setStatus(`Error converting IFC file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConverting(false);
    }
  };

  const loadSampleModel = async () => {
    setStatus("Loading sample IFC file...");
    setIsConverting(true);
    setProgress(0);
    
    try {
      const response = await fetch("https://thatopen.github.io/engine_fragment/resources/ifc/school_str.ifc");
      if (!response.ok) throw new Error(`Failed to fetch sample: ${response.status}`);
      
      setProgress(30);
      const arrayBuffer = await response.arrayBuffer();
      setProgress(60);
      
      const file = new File([arrayBuffer], "sample.ifc", { type: 'application/ifc' });
      setFileName(file.name);
      
      // Initialize the serializer
      const serializer = new FRAGS.IfcImporter();
      serializer.wasm = { absolute: true, path: "https://unpkg.com/web-ifc@0.0.68/" };
      
      // Set up progress tracking
      serializer.onProgress = (progress) => {
        // Map the conversion progress to overall progress (60-90)
        setProgress(60 + Math.round(progress * 30));
      };
      
      const ifcBytes = new Uint8Array(arrayBuffer);
      const bytes = await serializer.process({ bytes: ifcBytes });
      setProgress(100);
      
      setFragmentBytes(bytes);
      setStatus(`Sample converted! Ready to download`);
    } catch (error) {
      console.error("Error loading sample:", error);
      setStatus(`Error loading sample file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConverting(false);
    }
  };

  const downloadFragments = () => {
    if (!fragmentBytes) return;
    
    const name = fileName.replace('.ifc', '.frag') || "converted.frag";
    const file = new File([fragmentBytes], name);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(a.href);
    
    setStatus(`File downloaded: ${name}`);
  };

  const resetConverter = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setFragmentBytes(null);
    setFileName("");
    setStatus("Upload an IFC file to begin");
    setProgress(0);
  };

  // SVG Icons
  const icons = {
    upload: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>
    ),
    download: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
    ),
    reset: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 2v6h6"></path>
        <path d="M21 12A9 9 0 0 0 6 5.3L3 8"></path>
        <path d="M21 22v-6h-6"></path>
        <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path>
      </svg>
    ),
    sample: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="12" y1="18" x2="12" y2="12"></line>
        <line x1="9" y1="15" x2="15" y2="15"></line>
      </svg>
    ),
    convert: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3v10"></path>
        <path d="M7 21v-10"></path>
        <path d="M20 6l-3-3-3 3"></path>
        <path d="M4 18l3 3 3-3"></path>
      </svg>
    )
  };

  return (
    <div className="converter-container">
      <div className="converter-card">
        <h2 className="converter-title">IFC to Fragments Converter</h2>
        
        <div className="status-container">
          <p className="status-text">{status}</p>
          
          {isConverting && (
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${progress}%` }}></div>
              <span className="progress-text">{progress}%</span>
            </div>
          )}
        </div>
        
        {fileName && <p className="file-name">{fileName}</p>}
        
        <div className="converter-actions">
          {!fragmentBytes ? (
            <>
              <label htmlFor="ifc-upload" className="button upload-button">
                {icons.upload} Choose IFC File
              </label>
              <input
                type="file"
                id="ifc-upload"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".ifc"
                className="file-input"
              />
              
              <div className="button-group">
                <button 
                  className={`button convert-button ${(!fileName || isConverting) ? 'disabled' : ''}`}
                  onClick={convertIFC}
                  disabled={!fileName || isConverting}
                >
                  {icons.convert} {isConverting ? "Converting..." : "Convert"}
                </button>
                <button 
                  className={`button sample-button ${isConverting ? 'disabled' : ''}`}
                  onClick={loadSampleModel}
                  disabled={isConverting}
                >
                  {icons.sample} Load Sample
                </button>
              </div>
            </>
          ) : (
            <>
              <button 
                className="button download-button"
                onClick={downloadFragments}
              >
                {icons.download} Download Fragments
              </button>
              <button 
                className="button reset-button"
                onClick={resetConverter}
              >
                {icons.reset} Start Over
              </button>
            </>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .converter-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background-color: #f5f7fa;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        
        .converter-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
          padding: 30px;
          width: 100%;
          max-width: 500px;
          transition: all 0.3s ease;
        }
        
        .converter-title {
          color: #2a3f5f;
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 24px 0;
          text-align: center;
        }
        
        .status-container {
          margin-bottom: 20px;
        }
        
        .status-text {
          color: #555;
          font-size: 15px;
          line-height: 1.5;
          padding: 12px;
          background-color: #f5f5f5;
          border-radius: 8px;
          border-left: 4px solid #2a3f5f;
          margin: 0 0 15px 0;
        }
        
        .progress-container {
          height: 10px;
          background-color: #eaeaea;
          border-radius: 5px;
          margin: 15px 0;
          overflow: hidden;
          position: relative;
        }
        
        .progress-bar {
          height: 100%;
          background-color: #2a3f5f;
          border-radius: 5px;
          transition: width 0.3s ease;
        }
        
        .progress-text {
          position: absolute;
          top: -20px;
          right: 0;
          font-size: 12px;
          color: #666;
        }
        
        .file-name {
          font-size: 14px;
          color: #666;
          margin: 0 0 20px 0;
          padding: 10px;
          background-color: #f0f0f0;
          border-radius: 6px;
          word-break: break-all;
        }
        
        .converter-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .button {
          padding: 12px 18px;
          background-color: #2a3f5f;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s;
        }
        
        .button:hover {
          background-color: #3a5275;
        }
        
        .upload-button {
          background-color: #2a3f5f;
        }
        
        .convert-button {
          flex: 1;
        }
        
        .sample-button {
          flex: 1;
          background-color: #455a7f;
        }
        
        .download-button {
          background-color: #1e8e3e;
        }
        
        .reset-button {
          background-color: #e74c3c;
        }
        
        .button.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .button-group {
          display: flex;
          gap: 10px;
        }
        
        .file-input {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default IFCFragmentsConverter;