# BucketClient

A modern, responsive S3 bucket management application that allows you to connect to and manage files in your S3 buckets with a clean, intuitive interface.

![BucketClient Screenshot](./public/screenshot.png)

## Features

- **Modern UI**: Clean, intuitive interface with light and dark mode support
- **Multiple S3 Providers**: Works with AWS S3, MinIO, or any S3-compatible storage service
- **Complete File Management**: Upload, download, preview, share, and organize your files
- **Mobile Responsive**: Fully responsive design that works on all devices
- **File Preview**: Preview images, videos, PDFs, and text files directly in the browser
- **Drag & Drop Support**: Easy file uploads with drag and drop functionality
- **Progress Tracking**: Real-time upload progress indicators
- **Shareable Links**: Generate temporary signed URLs for sharing files
- **Search & Sort**: Find files quickly with search and sorting options
- **Folder Management**: Create and navigate folders just like a local file system
- **Local Credentials Storage**: Securely store your S3 credentials in browser localStorage

## Getting Started

### Prerequisites

- Node.js 14.x or higher
- npm 7.x or higher

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/bucketclient.git
   cd bucketclient
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Usage

1. **Connect to Your S3 Bucket**:
   - Enter your S3 credentials (endpoint, region, access key, secret key, and bucket name)
   - Click "Connect to S3"

2. **Navigate Your Files**:
   - Use the file browser to navigate through folders
   - Switch between grid and list views using the view toggle button

3. **Upload Files**:
   - Click the "Upload" button in the sidebar
   - Drag and drop files or use the file browser
   - Monitor upload progress in real-time

4. **Manage Files**:
   - Preview files by double-clicking them
   - Right-click on files for a context menu with options
   - Download, share, or delete files as needed
   - Create new folders to organize your content

5. **Share Files**:
   - Select a file and choose "Share" from the context menu
   - Set an expiration time for the link
   - Copy the generated URL to share with others

## Security

- Your S3 credentials are stored locally in your browser's localStorage
- Credentials are never sent to any server other than the S3 endpoint you specify
- Share links are generated with expiration times for temporary access

## Customization

### Theme

BucketClient comes with a light and dark theme that automatically detects your system preference. You can toggle between themes using the theme switch button in the sidebar.

### Styling

The application uses Tailwind CSS for styling. You can customize the appearance by modifying the `tailwind.config.js` file.

## Technologies Used

- [Svelte](https://svelte.dev/) - Frontend framework
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [AWS SDK for JavaScript](https://aws.amazon.com/sdk-for-javascript/) - S3 integration
- [Vite](https://vitejs.dev/) - Frontend build tool

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.




---
