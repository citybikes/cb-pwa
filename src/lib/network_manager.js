class NetworkManager {

  endpoint = '/networks/'

  static network_list = null
  static networks = new Map()

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
    if (! NetworkManager.promises.has(id)) {
      const promise = fetch(`${this.endpoint}`)
    }

    return NetworkManager.promises.get(id)
  }
}

export { NetworkManager }
