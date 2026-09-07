import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * ThreeCanvas
 * Lightweight, high-performance interactive 3D WebGL background
 * Features a floating geometric wireframe matrix, particle wave field,
 * and mouse parallax cursor tracking with Electric Lime (#CCFF00) lighting.
 */
export function ThreeCanvas({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Camera setup
    const scene = new THREE.Scene();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.z = 32;

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 3. Central Geometric Constructs (Wireframe Icosahedron & Torus Rings)
    const primaryColor = isDark ? 0xccff00 : 0x15803d;
    const secondaryColor = isDark ? 0x38bdf8 : 0x059669;

    // Core Icosahedron
    const icoGeo = new THREE.IcosahedronGeometry(7, 1);
    const icoMat = new THREE.MeshBasicMaterial({
      color: primaryColor,
      wireframe: true,
      transparent: true,
      opacity: isDark ? 0.35 : 0.22,
    });
    const icoMesh = new THREE.Mesh(icoGeo, icoMat);
    scene.add(icoMesh);

    // Outer Torus Ring
    const torusGeo = new THREE.TorusGeometry(12, 0.08, 16, 100);
    const torusMat = new THREE.MeshBasicMaterial({
      color: primaryColor,
      wireframe: true,
      transparent: true,
      opacity: isDark ? 0.45 : 0.25,
    });
    const torusMesh = new THREE.Mesh(torusGeo, torusMat);
    torusMesh.rotation.x = Math.PI / 3;
    scene.add(torusMesh);

    // Second inclined ring
    const torus2Geo = new THREE.TorusGeometry(14, 0.06, 16, 100);
    const torus2Mat = new THREE.MeshBasicMaterial({
      color: secondaryColor,
      wireframe: true,
      transparent: true,
      opacity: isDark ? 0.3 : 0.18,
    });
    const torus2Mesh = new THREE.Mesh(torus2Geo, torus2Mat);
    torus2Mesh.rotation.y = Math.PI / 4;
    scene.add(torus2Mesh);

    // 4. Ambient Particle Grid / Point Cloud
    const particleCount = 650;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleScales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 80;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 55;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 45;
      particleScales[i] = Math.random();
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    // Custom circle sprite texture for round particles
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.4, '#ccff00');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);
    }
    const particleTexture = new THREE.CanvasTexture(canvas);

    const particleMat = new THREE.PointsMaterial({
      size: isDark ? 1.4 : 1.1,
      map: particleTexture,
      transparent: true,
      opacity: isDark ? 0.65 : 0.35,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 5. Mouse Parallax & Cursor Tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      targetMouseX = (clientX / (rect.width || 1) - 0.5) * 2;
      targetMouseY = -(clientY / (rect.height || 1) - 0.5) * 2;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    // 6. Responsive Resize Handling
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);

    // 7. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth lerp mouse coordinates
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      // Rotate geometric meshes
      icoMesh.rotation.x = elapsedTime * 0.15;
      icoMesh.rotation.y = elapsedTime * 0.22;

      torusMesh.rotation.z = elapsedTime * 0.12;
      torusMesh.rotation.x = Math.PI / 3 + mouseX * 0.2;

      torus2Mesh.rotation.z = -elapsedTime * 0.09;
      torus2Mesh.rotation.y = Math.PI / 4 + mouseY * 0.2;

      // Gentle floating oscillation
      const floatOffset = Math.sin(elapsedTime * 0.8) * 0.8;
      icoMesh.position.y = floatOffset;
      torusMesh.position.y = floatOffset * 0.7;
      torus2Mesh.position.y = floatOffset * 0.5;

      // Parallax camera tilt
      camera.position.x = mouseX * 2.5;
      camera.position.y = mouseY * 2.0;
      camera.lookAt(0, 0, 0);

      // Rotate particle cloud slowly
      particles.rotation.y = elapsedTime * 0.03;
      particles.rotation.x = Math.sin(elapsedTime * 0.04) * 0.1;

      renderer.render(scene, camera);
    };

    animate();

    // 8. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      icoGeo.dispose();
      icoMat.dispose();
      torusGeo.dispose();
      torusMat.dispose();
      torus2Geo.dispose();
      tor2MatDisposable: torus2Mat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      particleTexture.dispose();
      renderer.dispose();
    };
  }, [isDark]);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
}
