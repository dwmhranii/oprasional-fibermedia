<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title }}</title>
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Marked.js CDN for Markdown Parsing -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <!-- Prism.js CDN for Syntax Highlighting -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" rel="stylesheet" />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js"></script>
    <!-- Mermaid CDN for Diagrams -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        body { font-family: 'Inter', sans-serif; }
        code, pre { font-family: 'Fira Code', monospace; }
        .prose pre { padding: 0 !important; background: transparent !important; }
        .prose code { color: #f43f5e; font-size: 0.9em; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
        .dark .prose code { color: #fb7185; background: #1e293b; }
        .prose pre code { color: inherit; background: transparent; padding: 0; }
        .prose h1 { font-size: 1.85rem; font-weight: 700; border-bottom: 2px solid #3b82f6; padding-bottom: 0.5rem; margin-top: 1.5rem; margin-bottom: 1rem; }
        .prose h2 { font-size: 1.45rem; font-weight: 600; margin-top: 1.75rem; margin-bottom: 0.75rem; border-left: 4px solid #3b82f6; padding-left: 0.75rem; }
        .prose h3 { font-size: 1.2rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; }
        .prose table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }
        .prose th, .prose td { border: 1px solid #cbd5e1; padding: 0.6rem 0.8rem; text-align: left; }
        .dark .prose th, .dark .prose td { border-color: #334155; }
        .prose th { background: #f8fafc; font-weight: 600; }
        .dark .prose th { background: #0f172a; }
        .prose blockquote { border-left: 4px solid #e2e8f0; padding-left: 1rem; color: #64748b; font-style: italic; }
        .dark .prose blockquote { border-color: #334155; color: #94a3b8; }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-200">

    <!-- Header Navigation -->
    <header class="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">F</div>
                <span class="font-bold text-lg text-slate-900 dark:text-white">Fibermedia API Docs</span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">v2.1 Frozen</span>
            </div>
            <div class="flex items-center space-x-4">
                <a href="/docs" class="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400">Documentation</a>
                <a href="/docs/freeze" class="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-400">API Freeze Specification</a>
                <a href="/api/docs/raw" target="_blank" class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition">Raw JSON</a>
                <!-- Dark Mode Toggle -->
                <button id="themeToggle" class="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition" aria-label="Toggle Theme">
                    <svg id="themeIcon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                </button>
            </div>
        </div>
    </header>

    <!-- Main Container -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        <!-- Sidebar Navigation -->
        <aside class="w-64 shrink-0 hidden lg:block sticky top-24 h-[calc(100vh-7rem)] overflow-y-auto pr-2">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Quick Navigation</h3>
            <nav id="sidebarNav" class="space-y-1 text-sm font-medium">
                <!-- Dynamically generated navigation links -->
            </nav>
        </aside>

        <!-- Content Area -->
        <main class="flex-1 min-w-0 bg-white dark:bg-slate-950 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <article id="docContent" class="prose dark:prose-invert max-w-none">
                <!-- Rendered Markdown Content -->
            </article>
        </main>
    </div>

    <!-- Hidden Raw Markdown Data -->
    <textarea id="rawMarkdown" class="hidden">{!! e($markdownContent) !!}</textarea>

    <script>
        // Theme Switcher Logic
        const themeToggle = document.getElementById('themeToggle');
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        themeToggle.addEventListener('click', () => {
            if (document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.remove('dark');
                localStorage.theme = 'light';
            } else {
                document.documentElement.classList.add('dark');
                localStorage.theme = 'dark';
            }
        });

        // Initialize Mermaid
        mermaid.initialize({ startOnLoad: false, theme: 'dark' });

        // Parse Markdown Content
        const rawContent = document.getElementById('rawMarkdown').value;
        const renderedHtml = marked.parse(rawContent);
        document.getElementById('docContent').innerHTML = renderedHtml;

        // Highlight Code Blocks with Prism
        Prism.highlightAll();

        // Generate Sidebar TOC dynamically
        const nav = document.getElementById('sidebarNav');
        const headings = document.querySelectorAll('#docContent h1, #docContent h2');
        headings.forEach((h, idx) => {
            const id = 'heading-' + idx;
            h.id = id;
            const a = document.createElement('a');
            a.href = '#' + id;
            a.textContent = h.textContent.replace(/^[\d\.\s]+/, '');
            a.className = h.tagName === 'H1' 
                ? 'block py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition text-xs' 
                : 'block py-1 px-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition text-xs pl-6';
            nav.appendChild(a);
        });

        // Render Mermaid Diagrams if present
        document.querySelectorAll('pre code.language-mermaid').forEach((el, index) => {
            const graphDefinition = el.textContent;
            const container = document.createElement('div');
            container.className = 'mermaid my-4 p-4 bg-slate-900 rounded-lg text-center';
            container.textContent = graphDefinition;
            el.parentElement.replaceWith(container);
        });
        mermaid.run();
    </script>
</body>
</html>
