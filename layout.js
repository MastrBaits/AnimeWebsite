// Inside ./src/app/layout.js

export const metadata = {
  title: "Anime Website",
  description: "Browse currently airing and top rated anime",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
