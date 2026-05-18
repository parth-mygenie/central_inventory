import { useState, useCallback, useRef, useEffect } from "react";
import axios from "axios";
import {
  PaperPlaneTilt,
  CaretDown,
  CaretRight,
  Warning,
  Check,
  X,
  Copy,
  FloppyDisk,
  ArrowsClockwise,
  Trash,
  Lightning,
  Globe,
  Clock,
  MagnifyingGlass,
  FunnelSimple,
} from "@phosphor-icons/react";
import {
  scanForTerminology,
  getMethodColor,
  getStatusColor,
  getRiskColor,
  VERIFICATION_STATUSES,
  getVerificationStatusInfo,
  TERM_MAP,
} from "@/lib/terminology";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// --- Sidebar: API Catalog ---
function ApiSidebar({ catalog, onSelect, selectedApi, filter, setFilter }) {
  const [collapsed, setCollapsed] = useState({});

  const toggle = (group) =>
    setCollapsed((p) => ({ ...p, [group]: !p[group] }));

  const filtered = catalog
    .map((g) => ({
      ...g,
      apis: g.apis.filter(
        (a) =>
          !filter ||
          a.name.toLowerCase().includes(filter.toLowerCase()) ||
          a.workflow.toLowerCase().includes(filter.toLowerCase())
      ),
    }))
    .filter((g) => g.apis.length > 0);

  return (
    <div
      className="w-72 border-r border-[#27272A] flex flex-col h-full shrink-0"
      data-testid="api-sidebar"
    >
      <div className="h-14 border-b border-[#27272A] flex items-center px-3 gap-2">
        <Lightning size={16} weight="bold" className="text-[#FAFAFA]" />
        <span className="text-xs font-semibold tracking-widest uppercase text-[#FAFAFA]">
          API Catalog
        </span>
      </div>
      <div className="p-2 border-b border-[#18181B]">
        <div className="flex items-center gap-2 bg-[#000] border border-[#27272A] px-2 py-1.5">
          <MagnifyingGlass size={14} className="text-[#52525B]" />
          <input
            data-testid="api-search-input"
            className="bg-transparent text-xs text-[#FAFAFA] outline-none flex-1 placeholder-[#52525B] font-mono"
            placeholder="Search APIs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((group) => (
          <div key={group.group}>
            <button
              className="w-full flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold tracking-widest uppercase text-[#A1A1AA] hover:bg-[#0A0A0A] border-b border-[#18181B]"
              onClick={() => toggle(group.group)}
              data-testid={`api-group-${group.group.replace(/\s+/g, "-").toLowerCase()}`}
            >
              {collapsed[group.group] ? (
                <CaretRight size={10} />
              ) : (
                <CaretDown size={10} />
              )}
              {group.group}
              <span className="ml-auto text-[#52525B]">{group.apis.length}</span>
            </button>
            {!collapsed[group.group] &&
              group.apis.map((api) => (
                <button
                  key={`${api.name}-${api.endpoint}`}
                  className={`w-full text-left px-3 py-2 flex items-start gap-2 border-b border-[#18181B] transition-colors duration-75 ${
                    selectedApi?.name === api.name &&
                    selectedApi?.endpoint === api.endpoint
                      ? "bg-[#18181B]"
                      : "hover:bg-[#0A0A0A]"
                  }`}
                  onClick={() => onSelect(api)}
                  data-testid={`api-list-item-${api.name.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  <span
                    className="text-[9px] font-mono font-bold tracking-wider mt-0.5 shrink-0 w-10 text-center"
                    style={{ color: getMethodColor(api.method) }}
                  >
                    {api.method}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs text-[#FAFAFA] truncate leading-tight">
                      {api.name}
                    </div>
                    <div className="text-[10px] text-[#52525B] truncate leading-tight mt-0.5">
                      {api.workflow}
                    </div>
                  </div>
                  {api.terminology_risk === "HIGH" && (
                    <Warning
                      size={12}
                      weight="bold"
                      className="text-[#F59E0B] shrink-0 mt-0.5"
                    />
                  )}
                </button>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Request Panel ---
function RequestPanel({
  url, setUrl, method, setMethod, headers, setHeaders,
  body, setBody, onSend, loading, baseUrl, setBaseUrl,
}) {
  return (
    <div
      className="flex-1 flex flex-col border-r border-[#27272A] overflow-hidden"
      data-testid="request-panel"
    >
      {/* URL Bar */}
      <div className="border-b border-[#27272A] p-3 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[10px] text-[#52525B] font-mono">
          <Globe size={12} />
          BASE URL
        </div>
        <input
          data-testid="base-url-input"
          className="bg-[#000] border border-[#27272A] px-3 py-1.5 text-xs font-mono text-[#A1A1AA] outline-none w-full focus:border-[#FAFAFA]"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://preprod.mygenie.online"
        />
        <div className="flex items-center gap-2">
          <select
            data-testid="method-selector"
            className="bg-[#000] border border-[#27272A] px-2 py-1.5 text-xs font-mono font-bold outline-none shrink-0 focus:border-[#FAFAFA]"
            style={{ color: getMethodColor(method) }}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
              <option key={m} value={m} style={{ color: getMethodColor(m) }}>
                {m}
              </option>
            ))}
          </select>
          <input
            data-testid="url-input"
            className="bg-[#000] border border-[#27272A] px-3 py-1.5 text-xs font-mono text-[#FAFAFA] outline-none flex-1 focus:border-[#FAFAFA]"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/api/v2/vendoremployee/..."
          />
          <button
            data-testid="send-request-btn"
            className="bg-[#FAFAFA] text-[#000] px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 hover:bg-[#E4E4E7] transition-colors duration-75 shrink-0 disabled:opacity-40"
            onClick={onSend}
            disabled={loading}
          >
            {loading ? (
              <ArrowsClockwise size={14} className="animate-spin" />
            ) : (
              <PaperPlaneTilt size={14} weight="bold" />
            )}
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>

      {/* Headers */}
      <div className="border-b border-[#27272A] flex flex-col">
        <div className="px-3 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-[#52525B] border-b border-[#18181B]">
          Headers (JSON)
        </div>
        <textarea
          data-testid="headers-input"
          className="bg-[#000] px-3 py-2 text-xs font-mono text-[#FAFAFA] outline-none resize-none h-20 placeholder-[#27272A]"
          value={headers}
          onChange={(e) => setHeaders(e.target.value)}
          placeholder='{"Authorization": "Bearer YOUR_TOKEN", "Accept": "application/json"}'
          spellCheck={false}
        />
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-3 py-1.5 text-[10px] font-semibold tracking-widest uppercase text-[#52525B] border-b border-[#18181B]">
          Request Body (JSON)
        </div>
        <textarea
          data-testid="body-input"
          className="bg-[#000] px-3 py-2 text-xs font-mono text-[#FAFAFA] outline-none resize-none flex-1 placeholder-[#27272A]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="{}"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

// --- Response Panel ---
function ResponsePanel({ response, terminologyFlags, onCopy, copied }) {
  const [tab, setTab] = useState("formatted");

  const formatted =
    response?.body != null
      ? typeof response.body === "string"
        ? response.body
        : JSON.stringify(response.body, null, 2)
      : "";

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      data-testid="response-panel"
    >
      {/* Status Bar */}
      <div className="border-b border-[#27272A] px-3 py-2 flex items-center gap-3">
        {response ? (
          <>
            <span
              data-testid="response-status"
              className="text-sm font-mono font-bold"
              style={{ color: getStatusColor(response.status_code) }}
            >
              {response.status_code || "ERR"}
            </span>
            <span className="text-[10px] text-[#52525B] font-mono flex items-center gap-1">
              <Clock size={10} />
              {response.elapsed_ms}ms
            </span>
            {response.error && (
              <span className="text-[10px] text-[#EF4444] font-mono truncate">
                {response.error}
              </span>
            )}
            <div className="ml-auto flex items-center gap-1">
              <button
                data-testid="copy-response-btn"
                className="px-2 py-1 text-[10px] text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#27272A] hover:border-[#52525B] flex items-center gap-1 transition-colors duration-75"
                onClick={onCopy}
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </>
        ) : (
          <span className="text-xs text-[#52525B]">
            Send a request to see the response
          </span>
        )}
      </div>

      {/* Terminology Warnings */}
      {terminologyFlags.length > 0 && (
        <div
          className="border-b border-[#F59E0B]/30 bg-[#F59E0B]/5 px-3 py-2"
          data-testid="terminology-warnings"
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Warning size={12} weight="bold" className="text-[#FBBF24]" />
            <span className="text-[10px] font-semibold tracking-widest uppercase text-[#FBBF24]">
              Terminology Mapping ({terminologyFlags.length})
            </span>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {terminologyFlags.map((flag, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-[10px] font-mono"
                data-testid={`terminology-flag-${i}`}
              >
                <span className="text-[#52525B] shrink-0">{flag.path}:</span>
                <span className="text-[#FBBF24]">
                  "{flag.value}"
                </span>
                <span className="text-[#52525B]">&rarr;</span>
                <span style={{ color: flag.mapped?.color || "#FAFAFA" }}>
                  {flag.mapped?.business} ({flag.mapped?.level})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#27272A]">
        {["formatted", "raw", "headers"].map((t) => (
          <button
            key={t}
            data-testid={`response-tab-${t}`}
            className={`px-3 py-1.5 text-[10px] font-semibold tracking-widest uppercase transition-colors duration-75 ${
              tab === t
                ? "text-[#FAFAFA] border-b border-[#FAFAFA]"
                : "text-[#52525B] hover:text-[#A1A1AA]"
            }`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-[#000]">
        {tab === "formatted" && (
          <pre
            className="p-3 text-xs font-mono text-[#FAFAFA] whitespace-pre-wrap break-words"
            data-testid="json-viewer"
          >
            {formatted || "No response yet"}
          </pre>
        )}
        {tab === "raw" && (
          <pre className="p-3 text-xs font-mono text-[#A1A1AA] whitespace-pre-wrap break-words">
            {response
              ? JSON.stringify(response, null, 2)
              : "No response yet"}
          </pre>
        )}
        {tab === "headers" && (
          <pre className="p-3 text-xs font-mono text-[#A1A1AA] whitespace-pre-wrap break-words">
            {response?.headers
              ? JSON.stringify(response.headers, null, 2)
              : "No headers yet"}
          </pre>
        )}
      </div>
    </div>
  );
}

// --- Verification Status Bar ---
function VerificationBar({
  selectedApi,
  verificationStatus,
  setVerificationStatus,
  notes,
  setNotes,
  onSave,
  saving,
}) {
  const statusInfo = getVerificationStatusInfo(verificationStatus);

  return (
    <div
      className="border-t border-[#27272A] px-3 py-2 flex items-center gap-3 bg-[#0A0A0A] shrink-0"
      data-testid="verification-bar"
    >
      <span className="text-[10px] font-semibold tracking-widest uppercase text-[#52525B] shrink-0">
        STATUS
      </span>
      <select
        data-testid="verification-status-select"
        className="bg-[#000] border border-[#27272A] px-2 py-1 text-[10px] font-mono outline-none focus:border-[#FAFAFA]"
        style={{ color: statusInfo.color }}
        value={verificationStatus}
        onChange={(e) => setVerificationStatus(e.target.value)}
      >
        {VERIFICATION_STATUSES.map((s) => (
          <option key={s.value} value={s.value} style={{ color: s.color }}>
            {s.label}
          </option>
        ))}
      </select>
      <input
        data-testid="verification-notes-input"
        className="bg-[#000] border border-[#27272A] px-2 py-1 text-[10px] font-mono text-[#FAFAFA] outline-none flex-1 placeholder-[#52525B] focus:border-[#FAFAFA]"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes..."
      />
      <button
        data-testid="save-verification-btn"
        className="bg-[#FAFAFA] text-[#000] px-3 py-1 text-[10px] font-semibold flex items-center gap-1 hover:bg-[#E4E4E7] transition-colors duration-75 disabled:opacity-40 shrink-0"
        onClick={onSave}
        disabled={saving || !selectedApi}
      >
        <FloppyDisk size={12} weight="bold" />
        {saving ? "Saving..." : "Save Evidence"}
      </button>
    </div>
  );
}

// --- Main Tool Component ---
export default function ApiVerificationTool() {
  const [catalog, setCatalog] = useState([]);
  const [selectedApi, setSelectedApi] = useState(null);
  const [filter, setFilter] = useState("");

  // Request state
  const [baseUrl, setBaseUrl] = useState("https://preprod.mygenie.online");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("POST");
  const [headers, setHeaders] = useState(
    '{"Accept": "application/json", "Content-Type": "application/json"}'
  );
  const [body, setBody] = useState("{}");
  const [loading, setLoading] = useState(false);

  // Response state
  const [response, setResponse] = useState(null);
  const [terminologyFlags, setTerminologyFlags] = useState([]);
  const [copied, setCopied] = useState(false);

  // Verification state
  const [verificationStatus, setVerificationStatus] = useState("not_tested");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Saved records
  const [savedRecords, setSavedRecords] = useState([]);
  const [showSaved, setShowSaved] = useState(false);

  // Load catalog
  useEffect(() => {
    axios
      .get(`${API}/api-catalog`)
      .then((r) => setCatalog(r.data))
      .catch(() => {});
    axios
      .get(`${API}/verifications`)
      .then((r) => setSavedRecords(r.data))
      .catch(() => {});
  }, []);

  const handleSelectApi = useCallback((api) => {
    setSelectedApi(api);
    setUrl(api.endpoint);
    setMethod(api.method);
    setBody(api.sample_body ? JSON.stringify(api.sample_body, null, 2) : "");
    setResponse(null);
    setTerminologyFlags([]);
    setVerificationStatus("not_tested");
    setNotes(api.notes || "");
    setCopied(false);
  }, []);

  const handleSend = useCallback(async () => {
    setLoading(true);
    setResponse(null);
    setTerminologyFlags([]);
    setCopied(false);

    let parsedHeaders = {};
    let parsedBody = null;

    try {
      parsedHeaders = headers ? JSON.parse(headers) : {};
    } catch {
      parsedHeaders = {};
    }
    try {
      parsedBody = body && method !== "GET" ? JSON.parse(body) : null;
    } catch {
      parsedBody = null;
    }

    const fullUrl = `${baseUrl}${url}`;

    try {
      const res = await axios.post(`${API}/proxy`, {
        url: fullUrl,
        method,
        headers: parsedHeaders,
        body: parsedBody,
        timeout: 30,
      });
      setResponse(res.data);

      // Scan for terminology
      if (res.data?.body && typeof res.data.body === "object") {
        const flags = scanForTerminology(res.data.body);
        setTerminologyFlags(flags);
      }
    } catch (err) {
      setResponse({
        status_code: 0,
        headers: {},
        body: null,
        elapsed_ms: 0,
        error: err.message || "Proxy request failed",
      });
    } finally {
      setLoading(false);
    }
  }, [baseUrl, url, method, headers, body]);

  const handleCopy = useCallback(() => {
    if (response?.body) {
      navigator.clipboard.writeText(
        typeof response.body === "string"
          ? response.body
          : JSON.stringify(response.body, null, 2)
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [response]);

  const handleSave = useCallback(async () => {
    if (!selectedApi) return;
    setSaving(true);

    let parsedHeaders = {};
    let parsedBody = null;
    try { parsedHeaders = headers ? JSON.parse(headers) : {}; } catch {}
    try { parsedBody = body ? JSON.parse(body) : null; } catch {}

    try {
      const record = {
        api_name: selectedApi.name,
        workflow: selectedApi.workflow,
        endpoint: `${baseUrl}${url}`,
        method,
        request_payload: parsedBody,
        request_headers: parsedHeaders,
        response_status: response?.status_code || null,
        response_body: response?.body || null,
        elapsed_ms: response?.elapsed_ms || null,
        status: verificationStatus,
        terminology_flags: terminologyFlags.map((f) => `${f.path}: ${f.value} -> ${f.mapped?.business}`),
        notes,
      };
      await axios.post(`${API}/verifications`, record);
      const updated = await axios.get(`${API}/verifications`);
      setSavedRecords(updated.data);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [selectedApi, baseUrl, url, method, headers, body, response, verificationStatus, terminologyFlags, notes]);

  const handleDeleteRecord = useCallback(async (id) => {
    try {
      await axios.delete(`${API}/verifications/${id}`);
      setSavedRecords((prev) => prev.filter((r) => r.id !== id));
    } catch {}
  }, []);

  return (
    <div
      className="h-screen w-full flex overflow-hidden bg-[#050505] text-[#FAFAFA]"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      data-testid="api-verification-tool"
    >
      {/* Sidebar */}
      <ApiSidebar
        catalog={catalog}
        onSelect={handleSelectApi}
        selectedApi={selectedApi}
        filter={filter}
        setFilter={setFilter}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Bar */}
        <div className="h-14 border-b border-[#27272A] flex items-center px-4 gap-3 shrink-0">
          <span className="text-sm font-semibold tracking-tight">
            Central Inventory API Verification Console
          </span>
          {selectedApi && (
            <>
              <span className="text-[#27272A]">|</span>
              <span
                className="text-[10px] font-mono font-bold tracking-wider"
                style={{ color: getMethodColor(selectedApi.method) }}
              >
                {selectedApi.method}
              </span>
              <span className="text-xs text-[#A1A1AA]">{selectedApi.name}</span>
              {selectedApi.terminology_risk && (
                <span
                  className="text-[9px] font-mono font-bold px-1.5 py-0.5 border"
                  style={{
                    color: getRiskColor(selectedApi.terminology_risk),
                    borderColor: getRiskColor(selectedApi.terminology_risk),
                    backgroundColor: `${getRiskColor(selectedApi.terminology_risk)}10`,
                  }}
                >
                  TERM RISK: {selectedApi.terminology_risk}
                </span>
              )}
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Terminology Legend */}
            <div className="flex items-center gap-2 mr-2">
              {Object.entries(TERM_MAP).map(([term, info]) => (
                <span
                  key={term}
                  className="text-[9px] font-mono px-1.5 py-0.5 border"
                  style={{
                    color: info.color,
                    borderColor: `${info.color}40`,
                    backgroundColor: `${info.color}10`,
                  }}
                >
                  {term} = {info.business}
                </span>
              ))}
            </div>
            <button
              data-testid="toggle-saved-btn"
              className={`px-2.5 py-1 text-[10px] font-semibold border transition-colors duration-75 flex items-center gap-1 ${
                showSaved
                  ? "bg-[#FAFAFA] text-[#000] border-[#FAFAFA]"
                  : "text-[#A1A1AA] border-[#27272A] hover:border-[#52525B]"
              }`}
              onClick={() => setShowSaved(!showSaved)}
            >
              <FunnelSimple size={12} />
              Saved ({savedRecords.length})
            </button>
          </div>
        </div>

        {/* Main Content */}
        {showSaved ? (
          <SavedRecords
            records={savedRecords}
            onDelete={handleDeleteRecord}
            onLoad={(rec) => {
              setBaseUrl("");
              setUrl(rec.endpoint);
              setMethod(rec.method);
              setHeaders(
                rec.request_headers
                  ? JSON.stringify(rec.request_headers, null, 2)
                  : "{}"
              );
              setBody(
                rec.request_payload
                  ? JSON.stringify(rec.request_payload, null, 2)
                  : ""
              );
              setResponse(
                rec.response_status
                  ? {
                      status_code: rec.response_status,
                      body: rec.response_body,
                      headers: {},
                      elapsed_ms: rec.elapsed_ms || 0,
                    }
                  : null
              );
              setVerificationStatus(rec.status);
              setNotes(rec.notes || "");
              setShowSaved(false);
            }}
          />
        ) : (
          <>
            <div className="flex-1 flex overflow-hidden">
              <RequestPanel
                url={url}
                setUrl={setUrl}
                method={method}
                setMethod={setMethod}
                headers={headers}
                setHeaders={setHeaders}
                body={body}
                setBody={setBody}
                onSend={handleSend}
                loading={loading}
                baseUrl={baseUrl}
                setBaseUrl={setBaseUrl}
              />
              <ResponsePanel
                response={response}
                terminologyFlags={terminologyFlags}
                onCopy={handleCopy}
                copied={copied}
              />
            </div>
            <VerificationBar
              selectedApi={selectedApi}
              verificationStatus={verificationStatus}
              setVerificationStatus={setVerificationStatus}
              notes={notes}
              setNotes={setNotes}
              onSave={handleSave}
              saving={saving}
            />
          </>
        )}
      </div>
    </div>
  );
}

// --- Saved Records View ---
function SavedRecords({ records, onDelete, onLoad }) {
  return (
    <div className="flex-1 overflow-auto p-4" data-testid="saved-records">
      <div className="text-xs font-semibold tracking-widest uppercase text-[#52525B] mb-3">
        Saved Verification Evidence ({records.length})
      </div>
      {records.length === 0 ? (
        <div className="text-xs text-[#52525B] text-center py-12">
          No saved records yet. Send a request and click "Save Evidence".
        </div>
      ) : (
        <div className="space-y-1">
          {records.map((rec) => {
            const statusInfo = getVerificationStatusInfo(rec.status);
            return (
              <div
                key={rec.id}
                className="flex items-center gap-3 px-3 py-2 border border-[#18181B] hover:border-[#27272A] transition-colors duration-75"
                data-testid={`saved-record-${rec.id}`}
              >
                <span
                  className="text-[9px] font-mono font-bold w-10 text-center shrink-0"
                  style={{ color: getMethodColor(rec.method) }}
                >
                  {rec.method}
                </span>
                <span className="text-xs text-[#FAFAFA] truncate w-40 shrink-0">
                  {rec.api_name}
                </span>
                <span className="text-[10px] font-mono text-[#52525B] truncate flex-1">
                  {rec.endpoint}
                </span>
                {rec.response_status && (
                  <span
                    className="text-[10px] font-mono font-bold shrink-0"
                    style={{ color: getStatusColor(rec.response_status) }}
                  >
                    {rec.response_status}
                  </span>
                )}
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 border shrink-0"
                  style={{
                    color: statusInfo.color,
                    borderColor: `${statusInfo.color}40`,
                  }}
                >
                  {statusInfo.label}
                </span>
                {rec.terminology_flags?.length > 0 && (
                  <Warning
                    size={12}
                    weight="bold"
                    className="text-[#F59E0B] shrink-0"
                  />
                )}
                <button
                  className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors duration-75 shrink-0"
                  onClick={() => onLoad(rec)}
                  data-testid={`load-record-${rec.id}`}
                >
                  <ArrowsClockwise size={14} />
                </button>
                <button
                  className="text-[#52525B] hover:text-[#EF4444] transition-colors duration-75 shrink-0"
                  onClick={() => onDelete(rec.id)}
                  data-testid={`delete-record-${rec.id}`}
                >
                  <Trash size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
