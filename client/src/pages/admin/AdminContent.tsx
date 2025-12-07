import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileText, MessageSquare, FolderTree, Trash2 } from "lucide-react";
import adminApi from "@/lib/adminApi";
import { toast } from "sonner";

export default function AdminContent() {
  const [activeTab, setActiveTab] = useState("scans");
  const [scans, setScans] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState({ scans: 1, docs: 1, conversations: 1 });
  const [pagination, setPagination] = useState<any>({});

  useEffect(() => {
    if (activeTab === "scans") loadScans();
    if (activeTab === "docs") loadDocs();
    if (activeTab === "conversations") loadConversations();
  }, [activeTab, page]);

  const loadScans = async () => {
    try {
      setIsLoading(true);
      const data = await adminApi.getScans({ page: page.scans, limit: 20 });
      setScans(data.scans);
      setPagination((p: any) => ({ ...p, scans: data.pagination }));
    } catch (error: any) {
      toast.error(error.message || "Failed to load scans");
    } finally {
      setIsLoading(false);
    }
  };

  const loadDocs = async () => {
    try {
      setIsLoading(true);
      const data = await adminApi.getDocumentation({ page: page.docs, limit: 20 });
      setDocs(data.documentation);
      setPagination((p: any) => ({ ...p, docs: data.pagination }));
    } catch (error: any) {
      toast.error(error.message || "Failed to load documentation");
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const data = await adminApi.getConversations({ page: page.conversations, limit: 20 });
      setConversations(data.conversations);
      setPagination((p: any) => ({ ...p, conversations: data.pagination }));
    } catch (error: any) {
      toast.error(error.message || "Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (type: string, id: string) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      if (type === "scan") await adminApi.deleteScan(id);
      if (type === "doc") await adminApi.deleteDocumentation(id);
      if (type === "conversation") await adminApi.deleteConversation(id);
      toast.success(`${type} deleted successfully`);
      if (type === "scan") loadScans();
      if (type === "doc") loadDocs();
      if (type === "conversation") loadConversations();
    } catch (error: any) {
      toast.error(error.message || `Failed to delete ${type}`);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Content Management</h1>
          <p className="text-muted-foreground">Manage scans, documentation, and conversations</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scans">
              <FileText className="h-4 w-4 mr-2" />
              Scans
            </TabsTrigger>
            <TabsTrigger value="docs">
              <FolderTree className="h-4 w-4 mr-2" />
              Documentation
            </TabsTrigger>
            <TabsTrigger value="conversations">
              <MessageSquare className="h-4 w-4 mr-2" />
              Conversations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scans" className="space-y-4">
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle>Scans</CardTitle>
                <CardDescription>
                  {pagination.scans && `${pagination.scans.total} total scans`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Target</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scans.map((scan) => (
                        <TableRow key={scan._id}>
                          <TableCell className="font-medium">{scan.target}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{scan.type}</Badge>
                          </TableCell>
                          <TableCell>{scan.userId?.email || "N/A"}</TableCell>
                          <TableCell>{new Date(scan.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete("scan", scan._id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs" className="space-y-4">
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle>Documentation</CardTitle>
                <CardDescription>
                  {pagination.docs && `${pagination.docs.total} total documentation`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Repository</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Generated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {docs.map((doc) => (
                        <TableRow key={doc._id}>
                          <TableCell className="font-medium">
                            {doc.repositoryId?.fullName || doc.repositoryId?.name || "N/A"}
                          </TableCell>
                          <TableCell>{doc.userId?.email || "N/A"}</TableCell>
                          <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete("doc", doc._id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conversations" className="space-y-4">
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle>Conversations</CardTitle>
                <CardDescription>
                  {pagination.conversations && `${pagination.conversations.total} total conversations`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Messages</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conversations.map((conv) => (
                        <TableRow key={conv._id}>
                          <TableCell className="font-medium">{conv.title || "Untitled"}</TableCell>
                          <TableCell>{conv.userId?.email || "N/A"}</TableCell>
                          <TableCell>{conv.messages?.length || 0}</TableCell>
                          <TableCell>{new Date(conv.updatedAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete("conversation", conv._id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

