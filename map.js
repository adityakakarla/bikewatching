mapboxgl.accessToken = 'pk.eyJ1IjoiYWRpdHlhLWtha2FybGEiLCJhIjoiY202N25qZGd3MDRleDJrbzlxcGIwamo3ZCJ9.C7TWHYxsspQHzoO1GcylZA';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-71.09415, 42.36027],
    zoom: 12,
    minZoom: 5,
    maxZoom: 18
});

let stations = [];
let circles;
let trips = []
let departures
let arrivals

function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.lon, +station.lat);
    const { x, y } = map.project(point);
    return { cx: x, cy: y };
}

function updatePositions() {
        circles
            .attr('cx', d => getCoords(d).cx)
            .attr('cy', d => getCoords(d).cy);
}

map.on('load', () => {
    const svg = d3.select('#map').select('svg');
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    d3.json(jsonurl).then(jsonData => {
        stations = jsonData.data.stations;

        circles = svg.selectAll('circle')
            .data(stations)
            .enter()
            .append('circle')
            .attr('r', 5)
            .attr('fill', 'steelblue')
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .attr('opacity', 0.8)
            .each(function(d) {
                d3.select(this)
                  .append('title')
                  .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
              });

        updatePositions();
    }).catch(error => {
        console.error('Error loading JSON:', error);
    });

    const csvurl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv'
    d3.csv(csvurl).then(trips => {
        departures = d3.rollup(
            trips,
            (v) => v.length,
            (d) => d.start_station_id
        );
    
        arrivals = d3.rollup(
            trips,
            (v) => v.length,
            (d) => d.end_station_id
        );
    
        stations = stations.map(station => {
            let id = station.short_name;
            station.arrivals = arrivals.get(id) ?? 0;
            station.departures = departures.get(id) ?? 0;
            station.totalTraffic = station.departures + station.arrivals;
            return station;
        });
    
        const radiusScale = d3.scaleSqrt()
                              .domain([0, d3.max(stations, d => d.totalTraffic)])
                              .range([0, 25]);
    
        circles.attr('r', d => radiusScale(d.totalTraffic));
    });
    


    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson?...'
    });

    map.addLayer({
        id: 'bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: {
            'line-color': 'green',
            'line-width': 3,
            'line-opacity': 0.7
        }
    });

    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
    });

    map.addLayer({
        id: 'cambridge-bike-lanes',
        type: 'line',
        source: 'cambridge_route',
        paint: {
            'line-color': 'green',
            'line-width': 3,
            'line-opacity': 0.7
        }
    });
});

map.on('move', updatePositions);
map.on('zoom', updatePositions);
map.on('resize', updatePositions);
map.on('moveend', updatePositions);