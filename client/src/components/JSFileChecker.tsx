import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";

export default function JSFileChecker() {
  const [files, setFiles] = useState<Record<string, { size: number, preview: string }> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const checkJSFiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/check-js-files');
      if (!response.ok) {
        throw new Error('Failed to check JS files');
      }
      const data = await response.json();
      setFiles(data.jsFiles);
      toast({
        title: "Verificação completada",
        description: "Conteúdo dos arquivos JS carregado com sucesso.",
      });
    } catch (error) {
      console.error('Error checking JS files:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao verificar arquivos JS. Veja o console para detalhes.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Verificar Arquivos JS</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={checkJSFiles} 
          disabled={isLoading} 
          className="mb-4"
        >
          {isLoading ? 'Verificando...' : 'Verificar conteúdo dos arquivos JS'}
        </Button>

        {files && (
          <div className="mt-4 space-y-4">
            <h3 className="text-lg font-medium">Arquivos detectados:</h3>
            {Object.entries(files).map(([filename, details]) => (
              <div key={filename} className="border p-4 rounded-md">
                <h4 className="font-bold">{filename}</h4>
                <p className="text-sm">Tamanho: {details.size} bytes</p>
                <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-md overflow-x-auto">
                  <pre className="text-xs">{details.preview}</pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}