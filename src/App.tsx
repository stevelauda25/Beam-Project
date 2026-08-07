import { CSSProperties, FormEvent, useMemo, useState } from "react";

type Folder = { id: number; name: string; storage: string; created: string; starter?: boolean };

const asset = (name: string) => `/assets/${name}`;
const initialFolders: Folder[] = [
  { id: 1, name: "Folder", storage: "2.4 KB", created: "Aug 5, 2026", starter: true },
  { id: 2, name: "Website Asset", storage: "0.0 KB", created: "Aug 8, 2026" },
  { id: 3, name: "Starter Project", storage: "0.0 KB", created: "Aug 10, 2026" },
];
const files = ["folder.md", "backup-prompt.md", "getting-started.md", "organize-thoughts-prompt.md"];
type StarterFile = {
  id: number;
  name: string;
  kind: string;
  size: string;
  added: string;
  protected?: boolean;
  intro: string;
  sections: { heading: string; body: string }[];
  closing?: string;
};

const starterFiles: StarterFile[] = [
  {
    id: 1, name: "Folder.md", kind: "md", size: "1 KB", added: "Aug, 5 2026", protected: true,
    intro: "This file is the operating guide for the project. Agents read it first to understand the goal, working conventions, and where every artifact belongs.",
    sections: [
      { heading: "Project purpose", body: "Use this Folder as the shared workspace for planning, source material, drafts, and final delivery. Keep decisions visible and make every saved file easy to understand without extra context." },
      { heading: "Working rules", body: "Read this file before starting. Preserve source material, use descriptive filenames, and record meaningful changes. Create a new file for substantial output instead of overwriting the original." },
      { heading: "Folder structure", body: "Prompt templates live at the root for quick access. Project-specific research goes into a dedicated subfolder, while approved deliverables belong in a clearly named final folder." },
    ],
    closing: "When the task is complete, summarize what changed and where the final files were saved.",
  },
  {
    id: 2, name: "backup-prompt.md", kind: "md", size: "869 B", added: "Aug, 5 2026",
    intro: "Create a safe, reviewable backup before making broad changes to files in this Folder.",
    sections: [
      { heading: "Before you begin", body: "Identify every file that may be changed and note its current purpose. Do not modify source files until a backup copy is confirmed." },
      { heading: "Backup procedure", body: "Create a timestamped backup folder, copy the affected files, and preserve their original names. Add a short manifest describing the reason for the backup and the expected changes." },
      { heading: "Verification", body: "Compare file counts and sizes, then open a sample of the copied files. Report any item that could not be backed up before continuing." },
      { heading: "Restore instruction", body: "If a change fails, restore only the affected files and keep the failed version for investigation. Document the restore in the backup manifest." },
    ],
  },
  {
    id: 3, name: "getting-started.md", kind: "md", size: "278 B", added: "Aug, 5 2026",
    intro: "Your Folder is ready to go the moment you sign up. It ships with three things: `folder.md` as the root operating file, a set of reusable prompt files for common agent tasks, and a live API key created during signup.",
    sections: [
      { heading: "The core idea", body: "Everything lives in one place, and `folder.md` is the entry point. Whenever an agent starts a task, it reads `folder.md` first — that's how it learns the context, the conventions, and where things belong." },
      { heading: "Your first three moves", body: "Start by editing `folder.md` so it reflects how you actually work. Then upload your source material — notes, screenshots, drafts, whatever the task needs. Finally, hand it to an agent with one instruction: read `folder.md` first, and keep the structure tidy as you go." },
      { heading: "What this is good for", body: "A Folder shines when you need to turn loose notes into clean docs without losing the meaning, or when you want to drop in a pile of assets and let an agent sort them into a sane structure. It's also the natural home for project context, so a fresh agent can onboard in a single read. The rule of thumb: one Folder per project, client, or workstream." },
      { heading: "Handing off to an agent — what to say", body: "> Use my Folder as the working space for this task. Read `folder.md` first, keep the file structure tidy, and explain what you saved when you're done." },
    ],
    closing: "That's it. The agent takes it from there.",
  },
  {
    id: 4, name: "organize-thoughts-prompt.md", kind: "md", size: "241 B", added: "Aug, 5 2026",
    intro: "Turn unstructured notes into a clear document without losing useful nuance, open questions, or the author's original intent.",
    sections: [
      { heading: "Organize the material", body: "Group related ideas, identify the central theme, and separate facts from assumptions. Keep important examples close to the point they support." },
      { heading: "Build a useful structure", body: "Start with a concise summary, follow with themed sections, and end with decisions, open questions, and next actions. Use headings that communicate meaning instead of generic labels." },
      { heading: "Editing principles", body: "Remove repetition while preserving distinctive details. Clarify ambiguous language, flag contradictions, and never invent missing information." },
      { heading: "Final check", body: "Make sure a new reader can understand the context, see what matters, and know what should happen next. Save the organized document alongside the original notes." },
    ],
  },
];

function Icon({ name, size = 12, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <span className={`icon ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <img src={asset(name)} alt="" />
    </span>
  );
}

function StarterFolder({ onBack, selectedId, onSelect }: { onBack: () => void; selectedId: number | null; onSelect: (id: number | null) => void }) {
  const [detailFiles, setDetailFiles] = useState(starterFiles);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  function uploadFiles(list: FileList | null) {
    if (!list?.length) return;
    const additions = Array.from(list).map((file, index) => ({
      id: Date.now() + index,
      name: file.name,
      kind: file.name.includes(".") ? file.name.split(".").pop() || "file" : "file",
      size: file.size < 1024 ? `${file.size} B` : `${(file.size / 1024).toFixed(1)} KB`,
      added: "Aug, 12 2026",
      protected: false,
      intro: "This uploaded file is ready to use in the Folder. Its preview content is represented locally for this prototype.",
      sections: [{ heading: "Uploaded file", body: "The original file has been added to the local folder list. Connect this prototype to storage to load and persist its complete contents." }],
    }));
    setDetailFiles((items) => [...items, ...additions]);
  }

  const selectedFile = detailFiles.find((file) => file.id === selectedId) || null;

  async function copyLink(file: StarterFile) {
    const link = `${window.location.origin}${window.location.pathname}#folder/${encodeURIComponent(file.name)}`;
    try { await navigator.clipboard.writeText(link); }
    catch {
      const input = document.createElement("textarea"); input.value = link; document.body.appendChild(input); input.select(); document.execCommand("copy"); input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadFile(file: StarterFile) {
    const body = [`# ${file.name}`, "", file.intro, "", ...file.sections.flatMap((section) => [`## ${section.heading}`, "", section.body, ""]), file.closing || ""].join("\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = file.name; link.click(); URL.revokeObjectURL(url);
  }

  const activity = [
    ["folder.md", "/folder.md"],
    ["organize-thoughts-prompt.md", "/organize-thoughts-prompt.md"],
    ["folder.md", "/folder.md"],
  ];

  return (
    <section className={`starter-page${selectedFile ? " preview-open" : ""}`}>
      <div className="starter-main-pane">
        <div className="back-bar"><button onClick={onBack}><Icon name="arrow-left.svg" size={10} />Back</button></div>
        <div className="starter-card-wrap">
        <div className="starter-card-head">
          <div className="starter-heading">
            <div><h1>Folder</h1><span className="starter-badge">Starter</span></div>
            <div className="folder-meta"><span>Files <strong>{String(detailFiles.length).padStart(2, "0")}</strong></span><Icon name="meta-separator.svg" size={8} /><span>Size <strong>2.4 KB</strong></span></div>
          </div>
          <label className="upload-button"><Icon name="upload.svg" size={10} />Upload<input type="file" multiple onChange={(event) => uploadFiles(event.target.files)} /></label>
        </div>
        <div className="starter-table-shell">
          <div className="detail-table" role="table" aria-label="Files in Folder">
            <div className="detail-row detail-head" role="row"><span>Name</span><span>Kind</span><span>Size</span><span>Added</span><span /></div>
            {detailFiles.map((file, index) => <div style={{ "--detail-index": index } as CSSProperties} className={`detail-row selectable-file${selectedId === file.id ? " selected-file" : ""}`} role="row" key={file.id} tabIndex={0} onClick={() => onSelect(file.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(file.id); }}>
              <span className="detail-name"><Icon name="file.svg" size={16} />{file.name}</span>
              <span>{file.kind}</span><span>{file.size}</span><span>{file.added}</span>
              <span className="row-actions">
                {!file.protected && <><button aria-label={`More options for ${file.name}`} onClick={(event) => { event.stopPropagation(); setOpenMenu(openMenu === file.id ? null : file.id); }}><Icon name="dots.svg" /></button><button aria-label={`Delete ${file.name}`} onClick={(event) => { event.stopPropagation(); setDetailFiles((items) => items.filter((item) => item.id !== file.id)); if (selectedId === file.id) onSelect(null); }}><Icon name="trash.svg" /></button></>}
                {openMenu === file.id && <div className="menu-popover detail-menu" onClick={(event) => event.stopPropagation()}><button onClick={() => { downloadFile(file); setOpenMenu(null); }}>Download</button></div>}
              </span>
            </div>)}
          </div>
        </div>
        </div>

        <section className="activity-section">
        <h2>Folder Activity</h2>
        <div className="activity-list">
          {activity.map(([name, path], index) => <div style={{ "--activity-index": index } as CSSProperties} className="activity-item" key={`${name}-${index}`}>
            <div className="activity-marker"><i />{index < activity.length - 1 && <span />}</div>
            <div className="activity-copy"><div><span>Michele J.</span><small>Viewed</small></div><p>{name} · {path}</p></div>
            <time>2h ago</time>
          </div>)}
        </div>
        </section>
      </div>

      {selectedFile && <aside className="file-preview" aria-label={`${selectedFile.name} preview`}>
        <div className="preview-close-bar"><button onClick={() => onSelect(null)}><Icon name="close.svg" size={10} />Close</button></div>
        <div className="preview-card" key={selectedFile.id}>
          <header className="preview-header">
            <div className="preview-title"><h2>{selectedFile.name}</h2><div><span>/{selectedFile.name}</span><Icon name="meta-separator.svg" size={8} /><span>{selectedFile.size}</span><Icon name="meta-separator.svg" size={8} /><span>Aug</span></div></div>
            <div className="preview-actions"><button className="active">Info</button><button onClick={() => copyLink(selectedFile)}>{copied ? "Copied!" : "Copy-link"}</button><button onClick={() => downloadFile(selectedFile)}>Download</button></div>
          </header>
          <article className="markdown-preview">
            <h1>{selectedFile.name}</h1>
            <p className="intro"><strong>{selectedFile.intro.split(". ")[0]}{selectedFile.intro.includes(". ") ? "." : ""}</strong>{selectedFile.intro.includes(". ") ? ` ${selectedFile.intro.split(". ").slice(1).join(". ")}` : ""}</p>
            {selectedFile.sections.map((section) => <section key={section.heading}><h3>{section.heading}</h3><p>{section.body}</p></section>)}
            {selectedFile.closing && <p>{selectedFile.closing}</p>}
          </article>
        </div>
        {copied && <div className="copy-toast">Link copied to clipboard</div>}
      </aside>}
    </section>
  );
}

export default function App() {
  const [folders, setFolders] = useState(initialFolders);
  const [query, setQuery] = useState("");
  const [folderOpen, setFolderOpen] = useState(true);
  const [websiteOpen, setWebsiteOpen] = useState(false);
  const [starterProjectOpen, setStarterProjectOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [refreshed, setRefreshed] = useState("20:12, Nov 12, 2026");
  const [menu, setMenu] = useState<number | null>(null);
  const [page, setPage] = useState<"folders" | "starter">("folders");
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);

  const visibleFolders = useMemo(
    () => folders.filter((folder) => folder.name.toLowerCase().includes(query.toLowerCase())),
    [folders, query],
  );

  function createFolder(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setFolders((items) => [...items, { id: Date.now(), name, storage: "0.0 KB", created: "Aug 12, 2026" }]);
    setNewName("");
    setDialogOpen(false);
  }

  return (
    <main className={`app-shell ${page === "starter" ? "detail-view" : "home-view"}`}>
      <aside className="sidebar">
        <div className="workspace-row">
          <Icon name="rhino-mark.svg" />
          <span className="shield"><Icon name="shield.svg" size={11} /></span>
          <span className="workspace-name">Personal</span>
          <Icon name="chevron.svg" size={16} />
        </div>

        <div className="sidebar-content">
          <div>
            <label className="search-box">
              <Icon name="search.svg" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" aria-label="Search folders" />
            </label>

            <button className="outline-new" onClick={() => setDialogOpen(true)}><Icon name="plus-dark.svg" />New Folder</button>

            <nav aria-label="Folders">
              <button className="active-nav" aria-expanded={folderOpen} onClick={() => setFolderOpen((open) => !open)}>
                <span><Icon name="chevron.svg" className={`nav-chevron${folderOpen ? " is-open" : ""}`} />Folder</span><span className="count">{files.length}</span>
              </button>
              <div className={`nav-collapse${folderOpen ? " is-open" : ""}`}><div><div className="file-list">
                  {files.map((file, index) => {
                    const match = starterFiles.find((item) => item.name.toLowerCase() === file.toLowerCase());
                    return <button style={{ "--nav-index": index } as CSSProperties} className={match?.id === selectedFileId ? "selected-sidebar-file" : ""} key={file} onClick={() => { setPage("starter"); if (match) setSelectedFileId(match.id); }}><Icon name="file.svg" /> <span>{file}</span></button>;
                  })}
              </div></div></div>
              <button className="folder-nav" aria-expanded={websiteOpen} onClick={() => setWebsiteOpen((open) => !open)}><Icon name="chevron.svg" className={`nav-chevron${websiteOpen ? " is-open" : ""}`} />Website Asset</button>
              <div className={`nav-collapse empty-collapse${websiteOpen ? " is-open" : ""}`}><div><p>No files yet</p></div></div>
              <button className="folder-nav" aria-expanded={starterProjectOpen} onClick={() => setStarterProjectOpen((open) => !open)}><Icon name="chevron.svg" className={`nav-chevron${starterProjectOpen ? " is-open" : ""}`} />Starter Project</button>
              <div className={`nav-collapse empty-collapse${starterProjectOpen ? " is-open" : ""}`}><div><p>No files yet</p></div></div>
            </nav>
          </div>

          <div className="sidebar-bottom">
            <div className="utility-links">
              <button><Icon name="key.svg" />API Keys</button>
              <button><Icon name="settings.svg" />Setting</button>
            </div>
            <button className="profile-row"><img src={asset("avatar.png")} alt="Michele J." /><span>Michele J.</span><Icon name="profile-chevron.svg" size={14} /></button>
          </div>
        </div>
      </aside>

      {page === "starter" ? <StarterFolder onBack={() => { setSelectedFileId(null); setPage("folders"); }} selectedId={selectedFileId} onSelect={setSelectedFileId} /> : <section className="content-area">
        <article className="folder-card">
          <header className="card-header">
            <div><div className="home-title"><h1>Folder</h1></div><p>File storage for your agents and applications.</p></div>
            <button className="primary-new" onClick={() => setDialogOpen(true)}><Icon name="plus-white.svg" size={10} />New Folder</button>
          </header>

          <div className="card-body">
            <div className="folder-table" role="table" aria-label="Folder list">
              <div className="table-row table-head" role="row"><span>Name</span><span>Storage</span><span>Created</span><span /></div>
              {visibleFolders.map((folder) => (
                <div style={{ "--row-index": folders.indexOf(folder) } as CSSProperties} className={`table-row${folder.starter ? " clickable-row" : ""}`} role="row" key={folder.id} onClick={() => folder.starter && setPage("starter")} tabIndex={folder.starter ? 0 : undefined} onKeyDown={(event) => { if (folder.starter && (event.key === "Enter" || event.key === " ")) setPage("starter"); }}>
                  <span className="folder-name"><Icon name="folder.svg" size={16} /><span>{folder.name}</span>{folder.starter && <span className="badge">Starter</span>}</span>
                  <span>{folder.storage}</span><span>{folder.created}</span>
                  <span className="row-actions">
                    {!folder.starter && <><button aria-label={`More options for ${folder.name}`} onClick={() => setMenu(menu === folder.id ? null : folder.id)}><Icon name="dots.svg" /></button><button aria-label={`Delete ${folder.name}`} onClick={() => setFolders((items) => items.filter((item) => item.id !== folder.id))}><Icon name="trash.svg" /></button></>}
                    {menu === folder.id && <div className="menu-popover"><button onClick={() => { setNewName(`${folder.name} Copy`); setDialogOpen(true); setMenu(null); }}>Duplicate</button></div>}
                  </span>
                </div>
              ))}
              {visibleFolders.length === 0 && <div className="empty">No folders match “{query}”.</div>}
            </div>

            <footer className="card-footer">
              <div className="stats">
                <span>Folders <strong>{String(folders.length).padStart(2, "0")}</strong></span>
                <span>Files <strong>04</strong></span>
                <span className="storage-label">Storage used</span>
                <span className="storage-bar"><i /></span>
                <span><strong>2.4 KB</strong> <em>/</em> 20 GB</span>
              </div>
              <div className="refresh"><span>Last refreshed {refreshed}</span><button aria-label="Refresh" onClick={() => setRefreshed(new Date().toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric", year: "numeric" }))}><Icon name="refresh.svg" /></button></div>
            </footer>
          </div>
        </article>
      </section>}

      {dialogOpen && <div className="dialog-backdrop" onMouseDown={() => setDialogOpen(false)}>
        <form className="dialog" onSubmit={createFolder} onMouseDown={(e) => e.stopPropagation()}>
          <h2>New Folder</h2><p>Create a folder for your files and agents.</p>
          <label>Folder name<input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Untitled folder" /></label>
          <div><button type="button" className="cancel" onClick={() => setDialogOpen(false)}>Cancel</button><button className="create" type="submit">Create folder</button></div>
        </form>
      </div>}
    </main>
  );
}
