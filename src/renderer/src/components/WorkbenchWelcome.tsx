import {
  Upload,
  FolderOpen,
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  HardDrive,
  FileArchive,
  Github,
  Code2,
  Folder,
  FileText,
  Check,
} from "lucide-react";
import type { Snapshot } from "../lib/history";
import { time, number } from "../lib/presentation";
export function WorkbenchWelcome({
  onFolder,
  onZip,
  onGithub,
  onDemo,
  onHistory,
  onRestore,
  snapshots,
  dragging,
}: {
  onFolder: () => void;
  onZip: () => void;
  onGithub: () => void;
  onDemo: () => void;
  onHistory: () => void;
  onRestore: (s: Snapshot) => void;
  snapshots: Snapshot[];
  dragging: boolean;
}) {
  return (
    <div className="welcome">
      <div className="welcome-heading">
        <h1>
          Your code, <br />
          accounted for.
        </h1>
        <p>Understand your files, languages and every line in between.</p>
      </div>
      <div className={`start-workspace ${dragging ? "is-dragging" : ""}`}>
        <div className="upload-workspace">
          <div className="upload-icon">
            <Upload size={29} strokeWidth={1.5} />
          </div>
          <h2>
            {dragging
              ? "Drop it. We’ll take it from here."
              : "Good things start with a folder."}
          </h2>
          <p>
            Drop your project here.
            <br />
            We’ll make sense of what’s inside.
          </p>
          <button className="button primary" onClick={onFolder}>
            <FolderOpen size={17} /> Choose a folder <ArrowRight size={17} />
          </button>
          <span className="upload-hint">
            Or press <kbd>Ctrl</kbd>
            <kbd>O</kbd>
          </span>
          <div className="import-alternatives">
            <span>Also works with</span>
            <button onClick={onZip}>
              <FileArchive size={15} /> ZIP file
            </button>
            <button onClick={onGithub}>
              <Github size={15} /> GitHub repo
            </button>
          </div>
          <div className="local-promise">
            <ShieldCheck size={15} /> Local files stay on this device
          </div>
        </div>
        <div className="example-workspace">
          <div className="example-top">
            <span>
              <Code2 size={17} /> A little project. A lot to discover.
            </span>
            <span className="demo-label">Example</span>
          </div>
          <div className="example-content">
            <div className="tree-root">
              <Folder size={17} /> studio-notes
            </div>
            <div className="source-tree">
              <div>
                <Folder size={16} /> src <span>5 files</span>
              </div>
              <div className="indent">
                <span className="file-extension">ts</span> notes.ts{" "}
                <span>TypeScript</span>
              </div>
              <div className="indent">
                <span className="file-extension">ts</span> tags.ts
              </div>
              <div className="indent">
                <span className="file-extension css-extension">css</span>{" "}
                styles.css
              </div>
              <div className="indent">
                <Folder size={15} /> utils
              </div>
              <div className="indent">
                <Folder size={15} /> legacy
              </div>
              <div>
                <Folder size={16} /> data
              </div>
              <div>
                <FileText size={15} /> README.md
              </div>
            </div>
            <div className="example-finding">
              <Check size={16} />
              <div>
                <strong>More than a line count.</strong>
                <span>Find languages, duplicates and unfinished ideas.</span>
              </div>
            </div>
          </div>
          <button className="example-action" onClick={onDemo}>
            Explore demo project <ArrowUpRight size={17} />
          </button>
        </div>
      </div>
      <div className="welcome-recent">
        <div className="section-header">
          <h2>Pick up where you left off</h2>
          {snapshots.length > 0 && (
            <button className="text-button" onClick={onHistory}>
              All history <ArrowRight size={15} />
            </button>
          )}
        </div>
        {snapshots.length ? (
          <div className="recent-grid">
            {snapshots.slice(0, 3).map((s) => (
              <button
                key={s.id}
                onClick={() => onRestore(s)}
                className="recent-project"
              >
                <Folder size={20} />
                <div>
                  <strong>{s.stats.scannedPath}</strong>
                  <span>
                    {number(s.stats.totalFiles)} files / {time(s.createdAt)}
                  </span>
                </div>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </div>
        ) : (
          <div className="first-scan-note">
            <HardDrive size={18} />
            <span>Your scans will appear here. Nothing to sign up for.</span>
          </div>
        )}
      </div>
      <section className="welcome-explainer">
        <div>
          <h2>From folder to full picture.</h2>
          <p>Three small steps. All on your device.</p>
        </div>
        <ol>
          <li>
            <span>1</span>
            <div>
              <h3>Bring your project</h3>
              <p>
                Choose a folder, drop a ZIP or fetch a public GitHub repository.
              </p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <h3>Get the whole picture</h3>
              <p>
                Explore languages, file sizes, comment markers and repeated
                content.
              </p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <h3>Keep what matters</h3>
              <p>Compare snapshots and download a PDF, CSV or JSON report.</p>
            </div>
          </li>
        </ol>
      </section>
      <section className="welcome-features">
        <h2>Built for looking closer.</h2>
        <div>
          <article>
            <ShieldCheck size={20} />
            <h3>Private by default</h3>
            <p>
              Local source files stay in browser memory. History stores scan
              metadata only.
            </p>
          </article>
          <article>
            <Code2 size={20} />
            <h3>Useful detail</h3>
            <p>
              Open a source preview, follow a TODO, or find byte-identical
              files.
            </p>
          </article>
          <article>
            <HardDrive size={20} />
            <h3>Your own record</h3>
            <p>
              Keep up to 20 scans in this browser and compare changes over time.
            </p>
          </article>
        </div>
      </section>
      <section className="supported-languages">
        <h2>Speaks your language.</h2>
        <p>
          TypeScript, JavaScript, Python, HTML, CSS, Rust, Go, Java, C++, and
          more.
        </p>
      </section>
      <section className="welcome-faq">
        <h2>A few things to know.</h2>
        {[
          {
            q: "Are my files uploaded anywhere?",
            a: "No. Local folders and ZIP files are analyzed on your device. GitHub import makes network requests only to retrieve the public repository you choose.",
          },
          {
            q: "What gets saved in history?",
            a: "File paths, counts, hashes and TODO/FIXME comment snippets. Source content is not saved. You can remove any snapshot from History.",
          },
          {
            q: "Can I exclude files?",
            a: "Yes. Default exclusions cover dependencies and build outputs. Add custom patterns in Settings. Root .gitignore and .omnicountignore files are also read.",
          },
          {
            q: "Can I export the results?",
            a: "Yes. Reports offers PDF summaries, CSV file details and full JSON snapshots.",
          },
        ].map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
