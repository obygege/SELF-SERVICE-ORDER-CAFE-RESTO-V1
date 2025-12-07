/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#ea580c',
                secondary: '#1e293b',
            }
        },
    },
    plugins: [],
}