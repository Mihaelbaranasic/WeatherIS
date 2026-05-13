import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [
        plugin(),
        tailwindcss(),
    ],
    server: {
        port: 52257,
    }
})