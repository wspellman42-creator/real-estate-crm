import { Home, RefreshCw, ExternalLink } from 'lucide-react'

export default function ListingsPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Listings</h1>
          <p className="text-gray-500 text-sm mt-0.5">All active team listings</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white border border-gray-200 px-3 py-2 rounded-lg">
            <RefreshCw size={13} />
            <span>MIBOR sync</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 ml-1" />
          </div>
        </div>
      </div>

      {/* Map placeholder */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-blue-200 h-64 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%236366f1\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
        />
        <div className="text-center">
          <Home size={32} className="text-blue-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-blue-700">Interactive Map</p>
          <p className="text-xs text-blue-500 mt-1">MIBOR MLS integration required</p>
          <a
            href="https://www.mibor.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-xs text-blue-600 underline hover:text-blue-700"
          >
            Connect MIBOR <ExternalLink size={11} />
          </a>
        </div>

        {/* Sample price pins */}
        <div className="absolute top-8 left-1/4 bg-white rounded-full px-2.5 py-1 shadow-md border border-gray-200 text-xs font-bold text-blue-700 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors">$385k</div>
        <div className="absolute top-16 right-1/3 bg-white rounded-full px-2.5 py-1 shadow-md border border-gray-200 text-xs font-bold text-blue-700 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors">$520k</div>
        <div className="absolute bottom-12 left-1/3 bg-white rounded-full px-2.5 py-1 shadow-md border border-gray-200 text-xs font-bold text-blue-700 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors">$299k</div>
        <div className="absolute bottom-8 right-1/4 bg-white rounded-full px-2.5 py-1 shadow-md border border-gray-200 text-xs font-bold text-blue-700 cursor-pointer hover:bg-blue-600 hover:text-white transition-colors">$675k</div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600 bg-white">
          <option>All Statuses</option>
          <option>Active</option>
          <option>Pending</option>
          <option>Sold</option>
        </select>
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600 bg-white">
          <option>All Agents</option>
        </select>
        <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600 bg-white">
          <option>Any Price</option>
          <option>Under $300k</option>
          <option>$300k–$500k</option>
          <option>$500k+</option>
        </select>
      </div>

      {/* Sample listings grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[
          { address: '4512 Maple Avenue', city: 'Indianapolis', price: '$385,000', bed: 4, bath: 3, sqft: '2,450', status: 'Active', agent: 'J. Smith', color: 'from-blue-400 to-blue-600', listed: 'May 28' },
          { address: '721 Oak Street', city: 'Carmel', price: '$520,000', bed: 5, bath: 4, sqft: '3,200', status: 'Active', agent: 'A. Davis', color: 'from-purple-400 to-purple-600', listed: 'Jun 1' },
          { address: '88 Birch Lane', city: 'Fishers', price: '$299,000', bed: 3, bath: 2, sqft: '1,800', status: 'Pending', agent: 'R. Kim', color: 'from-cyan-400 to-cyan-600', listed: 'May 10' },
          { address: '901 Pine Road', city: 'Zionsville', price: '$675,000', bed: 6, bath: 5, sqft: '4,100', status: 'Active', agent: 'J. Smith', color: 'from-green-400 to-green-600', listed: 'Jun 3' },
          { address: '237 Elm Drive', city: 'Westfield', price: '$445,000', bed: 4, bath: 3, sqft: '2,900', status: 'Active', agent: 'A. Davis', color: 'from-orange-400 to-orange-600', listed: 'May 22' },
        ].map((l, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
            <div className={`h-44 bg-gradient-to-br ${l.color} flex items-end p-3 relative`}>
              <span className={`absolute top-3 right-3 text-xs font-bold px-2 py-1 rounded-full ${
                l.status === 'Active' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
              }`}>{l.status}</span>
              <span className="bg-black/60 text-white font-bold text-base px-3 py-1.5 rounded-lg backdrop-blur-sm">{l.price}</span>
            </div>
            <div className="p-4">
              <p className="font-semibold text-gray-900 text-sm">{l.address}</p>
              <p className="text-xs text-gray-500 mt-0.5">{l.city}, IN</p>
              <p className="text-xs text-gray-500 mt-2">{l.bed} bd · {l.bath} ba · {l.sqft} sqft</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                    {l.agent.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="text-xs text-gray-500">{l.agent}</span>
                </div>
                <span className="text-xs text-gray-400">Listed {l.listed}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
        <strong>MIBOR Integration:</strong> To pull live listings from MIBOR MLS, connect your MLS credentials in Settings. Once connected, listings will auto-sync and the map will show real price pins.
      </div>
    </div>
  )
}
