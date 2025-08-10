// vite.config.ts - Optimized Version
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Path resolution for cleaner imports// vite.config.ts
resolve: {
  alias: {
    '@types': path.resolve(__dirname, './src/types'),
    '@components': path.resolve(__dirname, './src/components'),
    '@features': path.resolve(__dirname, './src/features'),
    '@pages': path.resolve(__dirname, './src/pages'),
    '@hooks': path.resolve(__dirname, './src/hooks'),
    '@utils': path.resolve(__dirname, './src/utils'),
    '@config': path.resolve(__dirname, './src/config'),
    '@services': path.resolve(__dirname, './src/services'),    
    '@contexts': path.resolve(__dirname, './src/contexts'),
    '@routes': path.resolve(__dirname, './src/routes'),
    '@styles': path.resolve(__dirname, './src/styles'),    
    '@': path.resolve(__dirname, './src'),
  },
},

  // Development server settings
  server: {
    port: 3000,
    host: true, // Expose to network
    open: true, // Auto-open browser
    hmr: {
      overlay: false // Disable error overlay for better UX
    }
  },

  // Preview server settings  
  preview: {
    port: 4173,
    host: true
  },

  // Build optimization\
    build: {
    outDir: 'dist',
    sourcemap: false, // Disable in production for security
    minify: 'esbuild', // Faster than terser
    
    // Rollup options for bundle optimization
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // React core
          'react-core': ['react', 'react-dom'],
          
          // Material-UI (large library)
          'mui-core': [
            '@mui/material',
            '@mui/icons-material',
            '@mui/x-data-grid',
            '@mui/x-date-pickers'
          ],
          
          // Firebase (separate chunk)
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          
          // Utilities and smaller libs
          'utils': [
            'axios',
            'date-fns', 
            'papaparse',
            'jspdf',
            'jspdf-autotable',
            'file-saver',
            'exceljs'
          ],
          
          // Router
          'router': ['react-router-dom'],
          
          // Form handling
          'forms': ['react-hook-form'],
          
          // Image processing
          'media': ['browser-image-compression']
        },
        
        // File naming strategy
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // Chunk size warning threshold
    chunkSizeWarningLimit: 1000,
    
    // Target modern browsers for smaller bundle
    target: 'es2020',
    
    // Enable CSS code splitting
    cssCodeSplit: true
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/icons-material',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore'
    ],
    exclude: ['firebase-admin'] // Exclude server-only packages
  },

  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})