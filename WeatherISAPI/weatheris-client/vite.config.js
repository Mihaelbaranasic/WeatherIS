import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [
        plugin(),
        tailwindcss(),
    ],
    server: {
        port: 5174,
        host: '127.0.0.1'
    }
})