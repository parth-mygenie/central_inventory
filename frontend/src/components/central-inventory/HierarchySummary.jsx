import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginContext } from "@/hooks/useLoginContext";
import api from "@/services/api";
import { mapRestaurantType, STORE_TYPE_FILTERS } from "@/lib/terminology";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/StateDisplays";
import { StoreTypeBadge } from "@/components/common/Badges";
import { Store, ArrowUpDown, Calendar, Search } from "lucide-react";

/**
 * SCR-02 Hierarchy Summary
 *
 * List of visible stores with sent/received/transaction counts.
 * Tab filter: "Master Stores" sends store_type="central" (inverted).
 * Tab filter: "Outlets" sends store_type="franchise".
 */
export default function HierarchySummary() {
  const navigate = useNavigate();
  const { restaurantType, isBottomLevel } = useLoginContext();

  const [activeTab, setActiveTab] = useState("masterStores");
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const fetchSummary = useCallback(async (tab) => {
    setLoading(true);
    setError(null);
    try {
      const storeType = STORE_TYPE_FILTERS[tab]; // CRITICAL: inverted mapping
      const resp = await api.getHierarchySummary({ storeType });
      const data = resp.data?.data || resp.data;
      setStores(data?.stores || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load hierarchy");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary(activeTab);
  }, [activeTab, fetchSummary]);

  const handleTabChange = (val) => {
    setActiveTab(val);
  };

  const filteredStores = stores.filter((s) => {
    if (!search) return true;
    return (s.restaurant_name || "").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div data-testid="hierarchy-summary">
      <h1 className="text-lg font-bold mb-4">Hierarchy Summary</h1>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <TabsList data-testid="hierarchy-tabs">
            <TabsTrigger data-testid="tab-master-stores" value="masterStores">
              Master Stores
            </TabsTrigger>
            <TabsTrigger data-testid="tab-outlets" value="outlets">
              Outlets
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              data-testid="hierarchy-search"
              placeholder="Search stores..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        <TabsContent value={activeTab}>
          {loading ? (
            <LoadingState lines={4} />
          ) : error ? (
            <ErrorState message={error} onRetry={() => fetchSummary(activeTab)} />
          ) : filteredStores.length === 0 ? (
            <EmptyState
              title="No stores found"
              description={search ? "Try a different search term" : "No stores available for this filter"}
              icon={Store}
            />
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-5">Store</div>
                <div className="col-span-2 text-right">Sent</div>
                <div className="col-span-2 text-right">Received</div>
                <div className="col-span-3 text-right">Transactions</div>
              </div>

              {filteredStores.map((store, idx) => (
                <Card
                  key={store.restaurant_id || idx}
                  data-testid={`store-row-${store.restaurant_id || idx}`}
                  className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() =>
                    navigate(`/store/${store.restaurant_id}`, {
                      state: {
                        storeName: store.restaurant_name,
                        storeType: store.restaurant_type,
                      },
                    })
                  }
                >
                  <CardContent className="py-2.5 px-3">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5 flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {store.restaurant_name || "Unnamed Store"}
                        </span>
                        <StoreTypeBadge backendType={store.restaurant_type} />
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-sm tabular-nums">{store.sent_quantity ?? 0}</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-sm tabular-nums">{store.received_quantity ?? 0}</span>
                      </div>
                      <div className="col-span-3 text-right">
                        <span className="text-sm tabular-nums">{store.transaction_count ?? 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
