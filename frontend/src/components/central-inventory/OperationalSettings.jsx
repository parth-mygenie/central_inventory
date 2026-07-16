import { useState, useEffect, useCallback } from "react";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/common/StateDisplays";
import ConfirmActionDialog from "./ConfirmActionDialog";
import { Settings, Shield, ArrowRightLeft, Bell, Cpu, Lock, Info, RefreshCw, Loader2 } from "lucide-react";

const SETTING_GROUPS = [
  {
    id: "policy",
    label: "Hierarchy Policy",
    icon: Shield,
    description: "Master-only settings that affect the entire hierarchy",
    masterOnly: true,
    keys: [
      { key: "allow_child_direct_vendor_purchase", label: "Allow Direct Vendor Purchase", description: "Central and franchise stores can create vendors and record stock purchases independently.", danger: true },
      { key: "allow_lateral_central_transfer", label: "Allow Lateral Central Transfers", description: "Central stores can transfer stock to sibling central stores." },
      { key: "allow_cross_central_franchise_dispatch", label: "Allow Cross-Branch Dispatch", description: "Central stores can dispatch to franchises under sibling central stores." },
    ],
  },
  {
    id: "transfer",
    label: "Transfer Behavior",
    icon: ArrowRightLeft,
    keys: [
      { key: "reserve_on_approve", label: "Reserve Stock on Approve", description: "Deduct segments at approval time instead of dispatch." },
      { key: "allow_over_receive", label: "Allow Over-Receive", description: "Receiver can accept more qty than dispatched." },
      { key: "allow_negative_stock", label: "Allow Negative Stock", description: "Allow aggregate stock quantity below zero." },
      { key: "allow_master_direct_franchise", label: "Master Direct to Franchise", description: "Master can push stock directly to franchise stores." },
    ],
  },
  {
    id: "alerts",
    label: "Alerts & Thresholds",
    icon: Bell,
    keys: [
      { key: "near_expiry_alert_days", label: "Near-Expiry Alert (days)", type: "number", description: "Alert window for expiring stock." },
      { key: "stale_transfer_hours_tier1", label: "Stale Transfer Tier 1 (hours)", type: "number", description: "First warning threshold for idle transfers." },
      { key: "stale_transfer_hours_tier2", label: "Stale Transfer Tier 2 (hours)", type: "number", description: "Critical threshold for idle transfers." },
      { key: "reconciliation_tolerance", label: "Reconciliation Tolerance", type: "number", step: "0.01", description: "Drift tolerance for segment vs master reconciliation." },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: Cpu,
    collapsed: true,
    keys: [
      { key: "allow_legacy_conversion", label: "Legacy Unit Conversion", description: "Fallback to legacy conversion rules." },
      { key: "async_dispatch_enabled", label: "Async Dispatch", description: "Use async job queue for dispatch processing." },
    ],
  },
];

function InheritedBadge({ storedSettings, settingKey, sourceId }) {
  const isStored = storedSettings && settingKey in storedSettings;
  if (isStored) return <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Set here</span>;
  return <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">Inherited{sourceId ? ` from #${sourceId}` : ""}</span>;
}

export default function OperationalSettings() {
  const { restaurantId, isTopLevel } = useLoginContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.getOperationalSettings(restaurantId);
      setData(resp.data?.data || resp.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleToggle = (key, currentValue, settingMeta) => {
    const newValue = !currentValue;
    if (settingMeta?.danger) {
      setConfirmDialog({
        title: `${newValue ? "Enable" : "Disable"} ${settingMeta.label}?`,
        description: settingMeta.description + (newValue ? " This applies to the entire hierarchy below this store." : ""),
        confirmLabel: newValue ? "Enable" : "Disable",
        onConfirm: () => doUpdate(key, newValue),
      });
    } else {
      doUpdate(key, newValue);
    }
  };

  const handleNumberChange = (key, value) => {
    const num = Number(value);
    if (!isNaN(num)) doUpdate(key, num);
  };

  const doUpdate = async (key, value) => {
    setSaving(key);
    setConfirmDialog(null);
    try {
      await api.updateOperationalSettings(restaurantId, { [key]: value });
      await fetchSettings();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to update";
      alert(msg);
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="p-4"><LoadingState lines={6} /></div>;
  if (error) return <div className="p-4"><ErrorState message={error} onRetry={fetchSettings} /></div>;

  const resolved = data?.resolved_settings || {};
  const stored = data?.stored_settings;
  const sourceId = data?.source_restaurant_id;

  return (
    <div data-testid="operational-settings">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2"><Settings className="h-5 w-5" /> Operational Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Configure inventory policies for your store hierarchy</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchSettings} disabled={loading} className="h-7 text-xs gap-1" data-testid="refresh-settings-btn">
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {SETTING_GROUPS.map((group) => {
          const GroupIcon = group.icon;
          const isMasterLocked = group.masterOnly && !isTopLevel;
          return (
            <Card key={group.id} data-testid={`settings-group-${group.id}`}>
              <CardHeader className="py-2.5 px-4">
                <CardTitle className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
                  <GroupIcon className="h-3.5 w-3.5" />
                  {group.label}
                  {isMasterLocked && <Lock className="h-3 w-3 text-amber-500 ml-1" />}
                  {group.masterOnly && isTopLevel && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 ml-auto normal-case tracking-normal" data-testid={`affects-all-${group.id}`}>
                      Affects all stores
                    </span>
                  )}
                </CardTitle>
                {group.description && <p className="text-[10px] text-muted-foreground mt-0.5">{group.description}</p>}
              </CardHeader>
              <CardContent className="py-2 px-4 space-y-3">
                {group.keys.map((setting) => {
                  const value = resolved[setting.key];
                  const isBoolean = setting.type !== "number";
                  const disabled = isMasterLocked || saving === setting.key;
                  return (
                    <div key={setting.key} className="flex items-center justify-between gap-4 py-1.5" data-testid={`setting-${setting.key}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs font-medium">{setting.label}</Label>
                          <InheritedBadge storedSettings={stored} settingKey={setting.key} sourceId={sourceId} />
                          {setting.danger && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200" data-testid={`impact-${setting.key}`}>High impact</span>}
                          {saving === setting.key && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                        </div>
                        {setting.description && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-start gap-1">
                            <Info className="h-3 w-3 mt-0.5 shrink-0 opacity-50" />{setting.description}
                          </p>
                        )}
                      </div>
                      {isBoolean ? (
                        <Switch
                          data-testid={`toggle-${setting.key}`}
                          checked={!!value}
                          onCheckedChange={() => handleToggle(setting.key, value, setting)}
                          disabled={disabled}
                        />
                      ) : (
                        <Input
                          data-testid={`input-${setting.key}`}
                          type="number"
                          step={setting.step || "1"}
                          value={value ?? ""}
                          onChange={(e) => handleNumberChange(setting.key, e.target.value)}
                          className="h-7 w-20 text-xs"
                          disabled={disabled}
                          onBlur={(e) => {
                            const num = Number(e.target.value);
                            if (!isNaN(num) && num !== value) doUpdate(setting.key, num);
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {confirmDialog && (
        <ConfirmActionDialog
          open={!!confirmDialog}
          onOpenChange={(v) => !v && setConfirmDialog(null)}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          onConfirm={confirmDialog.onConfirm}
          submitting={!!saving}
        />
      )}
    </div>
  );
}
