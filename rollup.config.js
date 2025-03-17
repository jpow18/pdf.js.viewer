import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

// noinspection JSUnusedGlobalSymbols
export default {
    input: './PdfJsViewer.js',
    output: {
        file: './dist/PDFJsViewer.js',
        format: 'es',
        name: 'bundle'
    },
    plugins: [
        resolve(),
        commonjs(),
    ]
}
