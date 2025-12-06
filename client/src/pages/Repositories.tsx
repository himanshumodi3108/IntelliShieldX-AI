import { Navbar } from "@/components/layout/Navbar";
import { RepositoryList } from "@/components/profile/RepositoryList";

const Repositories = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Repositories</h1>
            <p className="text-muted-foreground">
              Connect and manage your GitHub repositories for security scanning and documentation
            </p>
          </div>
          <RepositoryList />
        </div>
      </main>
    </div>
  );
};

export default Repositories;

