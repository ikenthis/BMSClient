"use client";

import { useState, useEffect, RefObject } from 'react';
import * as OBC from '@thatopen/components';
import * as FRAGS from '@thatopen/fragments';
import { ContainerSize } from '../utils/typeDefs';

/**
 * Hook para monitorear y actualizar el tamaño del contenedor
 */
export const useContainerSize = (
  containerRef: RefObject<HTMLDivElement>,
  world: OBC.World | null,
  fragments: FRAGS.FragmentsModels | null
): ContainerSize => {
  const [containerSize, setContainerSize] = useState<ContainerSize>({ width: 0, height: 0 });
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        
        if (width !== containerSize.width || height !== containerSize.height) {
          console.log(`📏 Container size: ${width}×${height}px`);
          setContainerSize({ width, height });
          
          // Update Three.js renderer if it exists
          if (world?.renderer?.three) {
            world.renderer.three.setSize(width, height);
            if (fragments) {
              fragments.update(true);
            }
          }
        }
      }
    };
    
    // Update size immediately
    updateSize();
    
    // Setup resize observer
    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(updateSize);
    });
    
    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [containerRef.current, world, fragments, containerSize.width, containerSize.height]);
  
  return containerSize;
};