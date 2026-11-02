'use client';
import {useEffect} from 'react';
import {MapContainer,TileLayer,Marker,Circle,useMap,useMapEvents} from 'react-leaflet';
import L from 'leaflet';
type Props={latitude:number|null;longitude:number|null;radius:number;onSelect:(lat:number,lng:number)=>void};
const start:[number,number]=[6.4,5.61];
const pointIcon=L.divIcon({className:'',html:'<span style="display:block;width:18px;height:18px;border:3px solid white;border-radius:50%;background:#1b78e5;box-shadow:0 1px 8px #111"></span>',iconSize:[18,18],iconAnchor:[9,9]});
function MapClick({onSelect}:{onSelect:(a:number,b:number)=>void}){useMapEvents({click:e=>onSelect(e.latlng.lat,e.latlng.lng)});return null;}
function FollowPoint({lat,lng}:{lat:number|null;lng:number|null}){const map=useMap();useEffect(()=>{if(lat!==null&&lng!==null)map.flyTo([lat,lng],Math.max(map.getZoom(),17),{duration:.6});},[lat,lng,map]);return null;}
export default function LocationMap({latitude,longitude,radius,onSelect}:Props){
 const selected: [number,number]|null=latitude!==null&&longitude!==null?[latitude,longitude]:null;
 return <div className="mapPickerWrap"><MapContainer center={selected??start} zoom={selected?17:15} scrollWheelZoom className="classroomMap"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><MapClick onSelect={onSelect}/><FollowPoint lat={latitude} lng={longitude}/>{selected&&<><Marker position={selected} icon={pointIcon}/><Circle center={selected} radius={radius} pathOptions={{color:'#1b78e5',fillColor:'#1b78e5',fillOpacity:.16,weight:2}}/></>}</MapContainer></div>;
}
