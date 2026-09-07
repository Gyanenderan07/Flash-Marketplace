import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '@/contexts/ThemeContext';

interface ThreeBackgroundProps {
  className?: string;
  density?: 'low' | 'normal' | 'high';
}

/**
 * ThreeBackground
 * High-performance, interactive Three.js 3D ambient canvas
 * Features floating wireframe geometric torus & icosahedron matrices,
 * an ambient neon particle constellation, point lighting, and smooth cursor parallax tracking.
 */
export function ThreeBackground({ className = '', density = 'normal' }: ThreeBackgroundProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 28;

    // 2. WebGL Renderer with High-Performance Config
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 3. Theme-matching Colors & Lighting
    const neonLime = 0xccff00;
    const cyberCyan = 0x38bdf8;

    // Soft Ambient Light & Accent Point Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(neonLime, 2.5, 60);
    pointLight.position.set(10, 10, 15);
    scene.add(pointLight);

    // 4. Central Geometric Matrix (Icosahedron & Dual Torus Rings)
    const icoGeo = new THREE.IcosahedronGeometry(6, 1);
    const icoMat = new THREE.MeshBasicMaterial({
      color: neonLime,
      wireframe: true,
      transparent: true,
      opacity: isDark ? 0.38 : 0.2,
    });
    const icoMesh = new THREE.Mesh(icoGeo, icoMat);
    scene.add(icoMesh);

    // Outer Torus Ring 1
    const torus1Geo = new THREE.TorusGeometry(10.5, 0.07, 16, 100);
    const torus1Mat = new THREE.MeshBasicMaterial({
      color: neonLime,
      wireframe: true,
      transparent: true,
      opacity: isDark ? 0.45 : 0.25,
    });
    const torus1Mesh = new THREE.Mesh(torus1Geo, torus1Mat);
    torus1Mesh.rotation.x = Math.PI / 3.5;
    scene.add(torus1Mesh);

    // Outer Torus Ring 2 (Intersecting cyan ring)
    const torus2Geo = new THREE.TorusGeometry(12.5, 0.05, 16, 100);
    const torus2Mat = new THREE.MeshBasicMaterial({
      color: cyberCyan,
      wireframe: true,
      transparent: true,
      opacity: isDark ? 0.32 : 0.18,
    });
    const torus2Mesh = new THREE.Mesh(torus2Geo, torus2Mat);
    torus2Mesh.rotation.y = Math.PI / 4;
    scene.add(torus2Mesh);

    // 5. Neon Particle Constellation
    const particleCounts = { low: 350, normal: 650, high: 950 };
    const count = particleCounts[density];
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 75;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Glow circle particle texture
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 32;
    pCanvas.height = 32;
    const pCtx = pCanvas.getContext('2d');
    if (pCtx) {
      const grad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#ccff00');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      pCtx.fillStyle = grad;
      pCtx.fillRect(0, 0, 32, 32);
    }
    const particleTexture = new THREE.CanvasTexture(pCanvas);

    const particleMat = new THREE.PointsMaterial({
      size: isDark ? 1.3 : 1.0,
      map: particleTexture,
      transparent: true,
      opacity: isDark ? 0.65 : 0.35,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 6. Interactive Cursor Tracking with Spring/Easing
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      targetMouseX = (clientX / (rect.width || 1) - 0.5) * 2;
      targetMouseY = -(clientY / (rect.height || 1) - 0.5) * 2;
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });

    // 7. Responsive Resize Handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);

    // 8. Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth Spring Easing for Mouse Tracking
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      // Rotation Dynamics
      icoMesh.rotation.x += delta * 0.25;
      icoMesh.rotation.y += delta * 0.35;

      torus1Mesh.rotation.z += delta * 0.18;
      torus1Mesh.rotation.x = Math.PI / 3.5 + mouseX * 0.25;

      torus2Mesh.rotation.z -= delta * 0.14;
      torus2Mesh.rotation.y = Math.PI / 4 + mouseY * 0.25;

      // Gentle floating levitation
      const levitate = Math.sin(elapsed * 0.9) * 0.6;
      icoMesh.position.y = levitate;
      torus1Mesh.position.y = levitate * 0.8;
      torus2Mesh.position.y = levitate * 0.6;

      // Camera Parallax
      camera.position.x = mouseX * 2.8;
      camera.position.y = mouseY * 2.2;
      camera.lookAt(0, 0, 0);

      // Rotate particle constellation
      particles.rotation.y += delta * 0.04;
      particles.rotation.x = Math.sin(elapsed * 0.05) * 0.08;

      renderer.render(scene, camera);
    };

    renderLoop();

    // 9. Thorough Resource Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('resize', onResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      icoGeo.dispose();
      icoMat.dispose();
      torus1Geo.dispose();
      tor1MatDisposable: torus1Mat.dispose();
      torus2Geo.dispose();
      tor2MatDisposable: torus2Mat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      particleTexture.dispose();
      renderer.dispose();
    };
  }, [isDark, density]);

  return (
    <div
      ref={mountRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
}

export default ThreeBackground;
