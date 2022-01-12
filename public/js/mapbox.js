export const displayMap = (locations) => {
    mapboxgl.accessToken = 'pk.eyJ1Ijoiam9uYXNjb3Vyc2UiLCJhIjoiY2t5MjZodXBvMGRnczJvbGpudzd5eWN2ciJ9.p663fUMFJ8toJIwDMbKYIQ';
    let map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/jonascourse/cky274k156ppc14o6586pzw35',
        scrollZoom: false//Disable zoom
    });

    //new mapboxgl.latLngBounds() from included script in header
    const bounds = new mapboxgl.LngLatBounds()

    locations.forEach(loc => {
        //Create marker
        const el = document.createElement('div')
        el.className = "marker"
        //Add marker
        new mapboxgl.Marker({
            element: el,
            anchor: 'bottom' //means that bottom of pin will be location that is pinned
        })
            .setLngLat(loc.coordinates)//Set locations for each tour place
            .addTo(map)

        //Add popup
        new mapboxgl.Popup({
            offset: 30
        })
            .setLngLat(loc.coordinates)
            .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
            .addTo(map)

        //Extends map bounds to include current location
        bounds.extend(loc.coordinates)
    })

    map.fitBounds(bounds, {
        padding: {
            top: 200,
            bottom: 150,
            left: 100,
            right: 100
        }
    })
}
