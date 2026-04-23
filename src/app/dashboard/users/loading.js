export default function UsersLoading() {
    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-pulse pb-20 px-2 md:px-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b pb-6">
                <div className="space-y-3">
                    <div className="h-8 w-64 bg-slate-200 rounded-md"></div>
                    <div className="h-4 w-40 bg-slate-100 rounded-md"></div>
                </div>
                <div className="h-12 w-72 bg-slate-100 rounded-2xl"></div>
            </div>
            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 h-14"></div>
                <div className="divide-y divide-slate-100">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="size-10 bg-slate-200 rounded-full"></div>
                                <div className="space-y-2">
                                    <div className="h-4 w-48 bg-slate-100 rounded"></div>
                                    <div className="h-3 w-24 bg-slate-50 rounded"></div>
                                </div>
                            </div>
                            <div className="h-4 w-44 bg-slate-100 rounded"></div>
                            <div className="h-7 w-28 bg-slate-100 rounded-full"></div>
                            <div className="h-10 w-40 bg-slate-100 rounded-xl"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}