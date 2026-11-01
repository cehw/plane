import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import world from 'https://esm.sh/@d3-maps/atlas@1.0.0/world/countries/countries-110m';
import {feature} from 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm';
const countries=feature(world,world.objects.features).features;
export async function renderMap(root,cells,select){
 if(!root)return;
 root._resize?.disconnect();root.replaceChildren();
 const svg=d3.select(root).append('svg').attr('role','img').attr('aria-label','全球 Netatmo 站点格网；圆点为旧站，绿色方点含新增站点');
 const draw=()=>{
  const width=root.clientWidth,height=Math.max(230,Math.min(500,width*.49));
  svg.attr('viewBox',`0 0 ${width} ${height}`).attr('width',width).attr('height',height);svg.selectAll('*').remove();
  const projection=d3.geoEqualEarth().fitExtent([[6,6],[width-6,height-6]],{type:'Sphere'}),path=d3.geoPath(projection);
  const g=svg.append('g');g.append('path').datum({type:'Sphere'}).attr('d',path).attr('class','map-ocean');
  g.selectAll('.country').data(countries).join('path').attr('class','map-land').attr('d',path);
  const points=g.selectAll('.station-cell').data(cells).join('path').attr('class',d=>'station-cell '+(d[4]>0?'new':d[3]>0?'both':'old')).attr('transform',d=>`translate(${projection(d.slice(0,2))})`).attr('d',d=>d3.symbol().type(d[4]>0?d3.symbolSquare:d3.symbolCircle).size(6+Math.sqrt(d[2]+d[3]+d[4])*1.9)());
  function nearest(event){const [x,y]=d3.pointer(event,svg.node()),tr=d3.zoomTransform(svg.node()),[sx,sy]=tr.invert([x,y]);let best,dist=Infinity;for(const c of cells){const p=projection(c.slice(0,2)),v=(p[0]-sx)**2+(p[1]-sy)**2;if(v<dist){dist=v;best=c;}}if(best&&Math.sqrt(dist)*tr.k<32){select(`${best[1].toFixed(2)}° 纬度 / ${best[0].toFixed(2)}° 经度 · 旧集独有 ${best[2]} · 两者都有 ${best[3]} · 新增 ${best[4]} 站`);}}
  svg.on('pointermove',nearest).on('click',nearest).call(d3.zoom().scaleExtent([1,12]).extent([[0,0],[width,height]]).translateExtent([[0,0],[width,height]]).on('zoom',e=>{g.attr('transform',e.transform);points.attr('stroke-width',.2/e.transform.k);}));
  svg.call(d3.zoom().transform,d3.zoomIdentity);
 };
 draw();root._resize=new ResizeObserver(draw);root._resize.observe(root);
 return ()=>{root._resize?.disconnect();svg.on("pointermove",null).on("click",null);};
};
