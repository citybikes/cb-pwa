class NetworkManager {

  endpoint = '/networks'

  static network_list = null
  static networks = new Map()
  static stations = new Map()
  static timer = null
  static INVALIDATE_INTERVAL = 10 * 1000
  static CACHE_FOR = 60 * 1000

  constructor() {

  }

  get networks() {
    return this.getNetworks()
  }

  getNetworks() {
    if (! NetworkManager.network_list ) {
      NetworkManager.network_list = fetch(this.endpoint)
        .then(async (res) => {
          console.log("Got networks")
          if (!res.ok) throw new Error('failed to fetch networks')
          const data = await res.json()
          // return it as a {net_id: net} map
          return new Map(data.networks.map((net) => [net.id, net]))
        })
        .catch((err) => {
          NetworkManager.network_list = null
          throw err
        })
    }

    return NetworkManager.network_list
  }

  getNetwork(id) {
    if (! NetworkManager.networks.has(id)) {
      const promise = fetch(`${this.endpoint}/${id}`)
        .then(r=>{
          if (!r.ok) throw new Error(r.status + " Failed Fetch ")
          return r.json()
        })
        // XXX Do something smarter?
        .then(d => {
          d.network.stations.forEach((st) => {
            const uid = `${d.network.id}-${st.id}`
            NetworkManager.stations.set(uid, { ...st, tag: d.network.id})
          })
          return d
        })
        .catch((err) => {
          NetworkManager.networks.delete(id)
          throw err
        })
      NetworkManager.networks.set(id, {ts: performance.now(), p: promise})
    }

    return NetworkManager.networks.get(id).p
  }

  // Receives a pseudo-station
  getStation({ id, tag, ... st } = {}) {
    if (id && tag) {
      return NetworkManager.stations.get(`${tag}-${id}`)
    }

    // "expensive" query, return first match
    if (id) {
      for (const st of NetworkManager.stations.values()) {
        if (id == st.id) return st
      }
    }

    return undefined
  }

  loaded(id) {
    return NetworkManager.networks.has(id)
  }

  get all() {
    return Promise.all(NetworkManager.networks.values())
  }

  startInvalidateTimer(onInvalid) {
    // only one instance of invalidate timer at a time
    if (NetworkManager.timer) return

    NetworkManager.timer = setInterval(() => {
      const invalid = this.invalidateTimer()
      onInvalid && onInvalid(invalid)
    }, NetworkManager.INVALIDATE_INTERVAL)
  }

  invalidateTimer() {
    const invalid = []
    NetworkManager.networks.forEach((value, key) => {
      if (performance.now() <= value.ts + NetworkManager.CACHE_FOR)
        return

      NetworkManager.networks.delete(key)
      invalid.push(key)

      // XXX Invalidate station cache
    })
    return invalid
  }

  killInvalidateTimer() {
    NetworkManager.timer && clearInterval(NetworkManager.timer)
  }
}

export { NetworkManager }
