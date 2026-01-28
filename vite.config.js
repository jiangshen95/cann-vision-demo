import { defineConfig } from 'vite'

export default defineConfig({
    base: '/cann-vision-demo/',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        // 生产环境移除 console.log，减小体积
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
            },
        },
    }
})