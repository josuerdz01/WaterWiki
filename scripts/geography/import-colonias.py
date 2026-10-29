import shapefile,json,collections,hashlib
from pathlib import Path
from shapely.geometry import shape,mapping
from shapely.ops import transform
from pyproj import Transformer
reader=shapefile.Reader('work/iieg/ISDC2020_2024'); municipalities=['Guadalajara','Zapopan','San Pedro Tlaquepaque','Tonalá','Tlajomulco de Zúñiga','El Salto','Juanacatlán','Ixtlahuacán de los Membrillos','Zapotlanejo']
project=Transformer.from_crs('EPSG:32613','EPSG:4326',always_xy=True).transform
legacy={'039138':100,'039142':102,'039139':103,'039136':104,'039126':105,'039128':106,'039033':107}
features=[];catalog=[];counts=collections.Counter()
def rounded(value):
 if isinstance(value,(list,tuple)):return [rounded(v) for v in value]
 return round(value,6) if isinstance(value,float) else value
for sr in reader.iterShapeRecords():
 r=sr.record.as_dict()
 if r['MUNICIPIO'] not in municipalities:continue
 g=shape(sr.shape.__geo_interface__)
 if not g.is_valid:g=g.buffer(0)
 assert not g.is_empty and g.is_valid
 # Two metre tolerance in native UTM; topology preserved, never inferred circles.
 g=transform(project,g.simplify(2,preserve_topology=True)); p=g.representative_point(); sid=r['GEOCOL']; zid=legacy.get(sid,10000+int(sid))
 props={'zoneId':zid,'sourceId':sid,'name':r['NOMCOL1'],'municipality':r['MUNICIPIO'],'type':r['Tipo']}
 geo=mapping(g);geo['coordinates']=rounded(geo['coordinates'])
 features.append({'type':'Feature','id':sid,'properties':props,'geometry':geo})
 catalog.append({'id':zid,'sourceId':sid,'name':r['NOMCOL1'],'municipality':r['MUNICIPIO'],'city':'gdl','lat':round(p.y,6),'lng':round(p.x,6),'state':3});counts[r['MUNICIPIO']]+=1
assert len(features)==2335 and len({z['id'] for z in catalog})==2335
catalog.sort(key=lambda z:(z['municipality'],z['name'],z['sourceId']))
Path('src/gdl-colonias.js').write_text('/* Generated from IIEG INE 2024. See public/data/COLONIAS.md. */\nexport const gdlColonias='+json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+';\n')
Path('public/data/colonias-gdl.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,separators=(',',':')))
manifest={'source':'https://iieg.gob.mx/ns/wp-content/uploads/2024/11/SHAPEColonias20202024.zip','version':'INE 2024 · IIEG','sourceSha256':hashlib.sha256(Path('work/colonias-iieg-2024.zip').read_bytes()).hexdigest(),'sourceRecords':6624,'includedRecords':len(catalog),'municipalities':dict(counts),'inputCrs':'EPSG:32613','outputCrs':'EPSG:4326','simplificationMetres':2}
Path('public/data/colonias-gdl-source.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2));print(json.dumps(manifest,ensure_ascii=False));print('GeoJSON bytes',Path('public/data/colonias-gdl.geojson').stat().st_size)
