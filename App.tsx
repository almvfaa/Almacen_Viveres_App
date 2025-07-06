
import React, { useState, useMemo, useCallback } from "react";
import {
  FaDatabase,
  FaFileContract,
  FaBoxOpen,
  FaUsers,
  FaBuilding,
  FaRobot,
  FaSpinner,
  FaSearch,
  FaChevronUp,
  FaChevronDown,
} from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { allData } from "./data";
import { queryDataWithGemini } from "./services/geminiService";
import type {
  Contrato,
  Articulo,
  Proveedor,
  Usuario,
} from "./types";

// --- UTILITY FUNCTIONS ---
const formatCurrency = (value: number | undefined) => {
  if (typeof value !== "number") return "$0.00";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
};

const parseDate = (dateString: string) => {
    //Handles "dd de month de yyyy" format
    const months: { [key: string]: number } = {
        enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
        julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
    };
    const parts = dateString.toLowerCase().split(' de ');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = months[parts[1]];
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && month !== undefined && !isNaN(year)) {
            return new Date(year, month, day);
        }
    }
    // Fallback for other formats like "dd/mm/yyyy"
    const dateParts = dateString.split('/');
    if (dateParts.length === 3) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
             return new Date(year, month, day);
        }
    }
    
    return new Date(dateString);
}


// --- DATA SERVICE & HOOKS ---
const useData = () => {
  const dataWithJoins = useMemo(() => {
    const articulosMap = new Map(
      allData.articulos.map((a) => [a.codigo, a])
    );
    const proveedoresMap = new Map(
      allData.proveedores.map((p) => [p.proveedor, p])
    );

    const adjudicadosConArticulo = allData.adjudicados.map((adj) => ({
      ...adj,
      articulo: articulosMap.get(adj.codigo_fk),
    }));

    const contratosConProveedor = allData.contratos.map((con) => ({
      ...con,
      proveedor: proveedoresMap.get(con.proveedor_fk),
      adjudicados: adjudicadosConArticulo.filter(
        (adj) => adj.contrato_fk === con.contrato
      ),
    }));

    return {
      ...allData,
      contratos: contratosConProveedor,
      adjudicados: adjudicadosConArticulo,
    };
  }, []);

  return dataWithJoins;
};

// --- UI COMPONENTS ---

const Card: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-md flex items-center transition-transform transform hover:scale-105">
    <div
      className={`p-4 rounded-xl mr-4 text-white`}
      style={{ backgroundColor: color }}
    >
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

type SortDirection = "asc" | "desc";
type SortConfig<T> = {
  key: keyof T;
  direction: SortDirection;
} | null;

const useSortableData = <T extends object>(
  items: T[],
  config: SortConfig<T> = null
) => {
  const [sortConfig, setSortConfig] = useState(config);

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
           if (aValue.toLowerCase() < bValue.toLowerCase()) {
              return sortConfig.direction === "asc" ? -1 : 1;
            }
            if (aValue.toLowerCase() > bValue.toLowerCase()) {
              return sortConfig.direction === "asc" ? 1 : -1;
            }
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            if (aValue < bValue) {
              return sortConfig.direction === "asc" ? -1 : 1;
            }
            if (aValue > bValue) {
              return sortConfig.direction === "asc" ? 1 : -1;
            }
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key: keyof T) => {
    let direction: SortDirection = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
};

const SortableTableHeader: React.FC<{
  label: string;
  sortKey: string;
  sortConfig: SortConfig<any> | null;
  requestSort: (key: any) => void;
}> = ({ label, sortKey, sortConfig, requestSort }) => {
  const isSorted = sortConfig?.key === sortKey;
  const directionIcon = isSorted ? (sortConfig.direction === 'asc' ? <FaChevronUp /> : <FaChevronDown />) : null;

  return (
    <th
      className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer"
      onClick={() => requestSort(sortKey)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {directionIcon}
      </div>
    </th>
  );
};


// --- PAGE COMPONENTS / VIEWS ---

const DashboardView: React.FC = () => {
  const { contratos, proveedores, articulos } = useData();

  const totalMontoMaximo = useMemo(
    () => contratos.reduce((sum, c) => sum + c.monto_maximo, 0),
    [contratos]
  );
  
  const contractStatusData = useMemo(() => {
    const now = new Date();
    const statusCounts = { vigente: 0, expirado: 0 };
    contratos.forEach(c => {
        const endDate = parseDate(c.fin_vigencia);
        if (!isNaN(endDate.getTime())) {
            if (endDate > now) {
                statusCounts.vigente++;
            } else {
                statusCounts.expirado++;
            }
        }
    });
    return [{name: 'Vigente', value: statusCounts.vigente}, {name: 'Expirado', value: statusCounts.expirado}];
  }, [contratos]);

  const spendingBySupplierData = useMemo(() => {
    const spending: { [key: string]: number } = {};
    contratos.forEach(c => {
      if (c.proveedor) {
        spending[c.proveedor.proveedor] = (spending[c.proveedor.proveedor] || 0) + c.monto_maximo;
      } else {
        spending[c.proveedor_fk] = (spending[c.proveedor_fk] || 0) + c.monto_maximo;
      }
    });
    return Object.entries(spending)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value)
        .slice(0, 10);
  }, [contratos]);

  const COLORS = ["#0088FE", "#FF8042"];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          title="Contratos Totales"
          value={contratos.length}
          icon={<FaFileContract size={24} />}
          color="#3B82F6"
        />
        <Card
          title="Proveedores Registrados"
          value={proveedores.length}
          icon={<FaBuilding size={24} />}
          color="#10B981"
        />
        <Card
          title="Productos en Catálogo"
          value={articulos.length}
          icon={<FaBoxOpen size={24} />}
          color="#F59E0B"
        />
        <Card
          title="Monto Total Contratado"
          value={formatCurrency(totalMontoMaximo)}
          icon={<FaDatabase size={24} />}
          color="#8B5CF6"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Gasto por Proveedor (Top 10)</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={spendingBySupplierData} margin={{ top: 5, right: 20, left: -10, bottom: 90 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{fontSize: 10}}/>
                    <YAxis tickFormatter={(val) => `$${(val/1e6).toFixed(1)}M`}/>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend verticalAlign="top" />
                    <Bar dataKey="value" name="Monto Máximo" fill="#3B82F6" />
                </BarChart>
            </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Estado de Contratos</h3>
            <ResponsiveContainer width="100%" height={300}>
               <PieChart>
                    <Pie data={contractStatusData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {contractStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} contratos`} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const DataExplorerView: React.FC = () => {
    const data = useData();
    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleQuery = async () => {
        if (!query.trim()) return;
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const contextData = {
                articulos: data.articulos.slice(0, 100), // Limiting for prompt size
                contratos: data.contratos.slice(0, 100).map(c => ({...c, adjudicados: c.adjudicados.length, proveedor: undefined})),
                proveedores: data.proveedores.slice(0, 100),
            };
            const aiResult = await queryDataWithGemini(query, contextData);
            setResult(aiResult);
        } catch (e: any) {
            setError(e.message || "Ocurrió un error al procesar la solicitud.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderResult = () => {
        if (!result) return null;

        if (Array.isArray(result) && result.length > 0) {
            const headers = Object.keys(result[0]);
            return (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white divide-y divide-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                            <tr>
                                {headers.map(header => <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header.replace(/_/g, ' ')}</th>)}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {result.map((row, index) => (
                                <tr key={index}>
                                    {headers.map(header => <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{typeof row[header] === 'object' ? JSON.stringify(row[header]) : String(row[header])}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
        }
        
        return <pre className="bg-gray-800 text-white p-4 rounded-lg text-sm">{JSON.stringify(result, null, 2)}</pre>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2"><FaRobot/> Explorador de Datos con IA</h3>
                <p className="text-sm text-gray-600 mb-4">Haz una pregunta en lenguaje natural sobre los datos de adquisiciones. (Ej: "¿Cuáles son los 10 productos más caros?", "Resume los contratos del proveedor 'COME FRUTAS Y VERDURAS, S.A DE C.V'")</p>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                        placeholder="Escribe tu pregunta aquí..."
                        className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        disabled={isLoading}
                    />
                    <button onClick={handleQuery} disabled={isLoading} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-blue-300 disabled:cursor-wait flex items-center gap-2">
                        {isLoading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
                        <span>Consultar</span>
                    </button>
                </div>
            </div>
            
            {isLoading && <div className="text-center p-6"><FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto" /></div>}
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">{error}</div>}
            {result && (
                <div className="bg-white p-6 rounded-2xl shadow-md">
                    <h4 className="text-md font-bold text-gray-800 mb-4">Resultado de la Consulta</h4>
                    {renderResult()}
                </div>
            )}
        </div>
    );
};

const DataTable: React.FC<{ columns: { key: keyof any; label: string; render?: (item: any) => React.ReactNode }[], data: any[], searchKeys: (keyof any)[] }> = ({ columns, data, searchKeys }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const { items: sortedData, requestSort, sortConfig } = useSortableData(data);

    const filteredData = useMemo(() => {
        if (!searchTerm) return sortedData;
        const lowercasedTerm = searchTerm.toLowerCase();
        return sortedData.filter(item => 
            searchKeys.some(key => {
                const value = item[key];
                return value !== null && value !== undefined && String(value).toLowerCase().includes(lowercasedTerm)
            })
        );
    }, [sortedData, searchTerm, searchKeys]);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-md">
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full md:w-1/3 p-2 border border-gray-300 rounded-lg"
                />
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map(col => (
                                <SortableTableHeader key={String(col.key)} label={col.label} sortKey={String(col.key)} sortConfig={sortConfig} requestSort={() => requestSort(col.key)} />
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredData.map((item, index) => (
                            <tr key={item.id_contrato || item.codigo || item.id_proveedor || item.rud || index} className="hover:bg-gray-50">
                                {columns.map(col => (
                                    <td key={String(col.key)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {col.render ? col.render(item) : String(item[col.key] ?? '')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
};


const ContractsView: React.FC = () => {
    const { contratos } = useData();
    const columns = [
        { key: 'contrato' as keyof Contrato, label: 'Contrato ID' },
        { key: 'proveedor_fk' as keyof Contrato, label: 'Proveedor' },
        { key: 'monto_maximo' as keyof Contrato, label: 'Monto Máximo', render: (item: Contrato) => formatCurrency(item.monto_maximo) },
        { key: 'inicio_vigencia' as keyof Contrato, label: 'Inicio Vigencia' },
        { key: 'fin_vigencia' as keyof Contrato, label: 'Fin Vigencia' },
    ];
    return <DataTable columns={columns} data={contratos} searchKeys={['contrato', 'proveedor_fk']} />
}
const ProductsView: React.FC = () => {
    const { articulos } = useData();
    const columns = [
        { key: 'codigo' as keyof Articulo, label: 'Código' },
        { key: 'descripcion_articulo' as keyof Articulo, label: 'Descripción' },
        { key: 'unidad_medida' as keyof Articulo, label: 'Unidad' },
        { key: 'precio_medio' as keyof Articulo, label: 'Precio Medio', render: (item: Articulo) => typeof item.precio_medio === 'number' ? formatCurrency(item.precio_medio) : item.precio_medio },
        { key: 'ultima_fecha' as keyof Articulo, label: 'Última Fecha' },
    ];
    return <DataTable columns={columns} data={articulos} searchKeys={['codigo', 'descripcion_articulo']} />
}
const SuppliersView: React.FC = () => {
    const { proveedores } = useData();
    const columns = [
        { key: 'id_proveedor' as keyof Proveedor, label: 'ID' },
        { key: 'proveedor' as keyof Proveedor, label: 'Nombre' },
        { key: 'domicilio' as keyof Proveedor, label: 'Domicilio' },
        { key: 'ciudad' as keyof Proveedor, label: 'Ciudad' },
        { key: 'giro_comercial' as keyof Proveedor, label: 'Giro Comercial' },
    ];
    return <DataTable columns={columns} data={proveedores} searchKeys={['proveedor', 'domicilio', 'giro_comercial']} />
}
const UsersView: React.FC = () => {
    const { usuarios } = useData();
    const columns = [
        { key: 'rud' as keyof Usuario, label: 'RUD' },
        { key: 'nombre' as keyof Usuario, label: 'Nombre' },
        { key: 'rol' as keyof Usuario, label: 'Rol' },
    ];
    return <DataTable columns={columns} data={usuarios} searchKeys={['nombre', 'rol', 'rud']} />
}

type Tab = "dashboard" | "explorer" | "contracts" | "products" | "suppliers" | "users";

const TABS: { id: Tab; label: string; icon: React.FC<any> }[] = [
  { id: "dashboard", label: "Dashboard", icon: FaDatabase },
  { id: "explorer", label: "Explorador IA", icon: FaRobot },
  { id: "contracts", label: "Contratos", icon: FaFileContract },
  { id: "products", label: "Productos", icon: FaBoxOpen },
  { id: "suppliers", label: "Proveedores", icon: FaBuilding },
  { id: "users", label: "Usuarios", icon: FaUsers },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView />;
      case "explorer":
        return <DataExplorerView />;
      case "contracts":
        return <ContractsView />;
      case "products":
        return <ProductsView />;
      case "suppliers":
        return <SuppliersView />;
      case "users":
        return <UsersView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <nav className="w-64 bg-white shadow-lg flex-shrink-0">
        <div className="p-6 text-center border-b">
          <h1 className="text-2xl font-bold text-blue-600">SAV-Faa</h1>
          <p className="text-xs text-gray-500 mt-1">Gestión Inteligente</p>
        </div>
        <ul className="py-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <li key={id} className="px-4">
              <button
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-4 px-4 py-3 my-1 rounded-lg text-left text-sm font-medium transition-all duration-200 ${
                  activeTab === id
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon
                  className={`text-lg ${
                    activeTab === id ? "text-white" : "text-gray-400"
                  }`}
                />
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main className="flex-1 p-8 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}
