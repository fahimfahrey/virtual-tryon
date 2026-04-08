import "./globals.css";

export const metadata = {
  title: "Virtual Try-On Mirror",
  description: "AI-powered virtual dress try-on kiosk",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://js.puter.com/v2/" defer></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
