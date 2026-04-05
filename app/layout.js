import "./globals.css";

export const metadata = {
  title: "Virtual Try-On Mirror",
  description: "AI-powered virtual dress try-on kiosk",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
