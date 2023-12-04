// Define 'require'
import module from 'module';
const require = module.createRequire(import.meta.url);

var express = require('express');
var socket = require('socket.io');
var mysql = require('mysql');
var pool  = mysql.createPool({
    connectionLimit : 10,
    host            : 'localhost',
    user            : 'root',
    password        : 'root',
    database        : 'limosdb',
    port            : 3306
});

var app = express();
var server = app.listen(3000, function(){
	console.log('Listening to requests on port 3000');
});
var io = socket(server);

io.on('connection', async function(socket){

	console.log('made socket connection', socket.id);

	socket.on('LoadElements', async function(data){
        var ResultLoadIni = await LoadElements(data);
        console.log(ResultLoadIni);
        socket.emit('LoadElementsBack',ResultLoadIni);
	});

    socket.on('EnviarDetalle', async function(data){        
        
        var Fecha = new Date().toISOString().slice(0, 19).replace('T', ' ');        
        var nFactura
        var nLote
        var oData = JSON.parse(data);
        console.log(oData.cuenta)
        console.log(data)
        var aDetalle = oData.lDetalle;

        if (aDetalle.length == 0){
            console.log('Pedido vacio')
            return
        }

        var ResultBuscarFactura = await BuscarFactura(oData.cuenta);
        console.log(ResultBuscarFactura)
        
        if (ResultBuscarFactura.length == 0){
            var ResultInsertFactura = await InsertarFactura(oData.cuenta,Fecha);            
            nFactura = ResultInsertFactura.insertId;
        }else{
            nFactura = ResultBuscarFactura[0].FacturaId;
        }
        
        var ResultInsertLote = await InsertarLote(oData.cuenta,Fecha);
        nLote = ResultInsertLote.insertId;
        console.log(nLote)

        for (var i = 0; i < aDetalle.length; i++){
            await InsertarDetalle(nFactura,aDetalle[i].descripcion,aDetalle[i].precio,nLote);
        }

    });

    socket.on('LoadExtras', async function(data){
        console.log('ElementoId: ' + data)
        if (data > 0){
            var ExtrasId = await LoadElement(data)
            console.log('ExtraId:' + ExtrasId[0].Extras)
            var aExtras = await LoadExtras(ExtrasId[0].Extras)
            console.log(aExtras)
            socket.emit('LoadExtrasBack',aExtras)
        }
    });

});

// Funciones
async function LoadElements(NodoPadre){
    return new Promise((resolve, reject)=>{
        pool.query("SELECT ElementoId,PadreId,Descripcion,Precio,Impuesto,ImprimirEnFactura,Final FROM elementos WHERE PadreId = '" + NodoPadre + "'", (error, results)=>{
            if(error){
                return reject(error);
            }
            return resolve(results);
        });
    });
};

async function LoadElement(ElementoId){
    return new Promise((resolve, reject)=>{
        pool.query("SELECT Extras FROM elementos WHERE ElementoId = '" + ElementoId + "'", (error, results)=>{
            if(error){
                return reject(error);
            }
            return resolve(results);
        });
    });
};

async function LoadExtras(ExtrasId){
    return new Promise((resolve, reject)=>{
        pool.query("SELECT * FROM extras WHERE ConjuntoId = '" + ExtrasId + "'", (error, results)=>{
            if(error){
                return reject(error);
            }
            return resolve(results);
        });
    });
};

async function BuscarFactura(cuenta){
    return new Promise((resolve, reject)=>{
        pool.query("SELECT * FROM facturas WHERE Sesion = '1' AND Estado = 'A' AND Nombre = '" + cuenta + "'", (error, results)=>{
            if(error){
                return reject(error);
            }
            return resolve(results);
        });
    });
};

async function InsertarFactura(cuenta,Fecha){
    return new Promise((resolve, reject)=>{
        pool.query("INSERT INTO facturas(Sesion,Estado,Nombre,Total,Cantidad,Cambio,FechaHora,FormaPago) VALUES('1','A','" + cuenta + "','0','0','0','" + Fecha + "','Contado')", (error, results)=>{
            if(error){
                return reject(error);
            }
            return resolve(results);
        });
    });
};

async function InsertarLote(cuenta,Fecha){
    return new Promise((resolve, reject)=>{
        pool.query("INSERT INTO lotes(Momento,NumeElem,NombCuen,Sesion) VALUES('" + Fecha + "','0','" + cuenta + "','1')", (error, results)=>{
            if(error){
                return reject(error);
            }
            return resolve(results);
        });
    });
};

async function InsertarDetalle(nFactura,Descripcion,Precio,nLote){
    return new Promise((resolve, reject)=>{
        pool.query("INSERT INTO detafact(FacturaId,Unidades,Descripcion,Precio,Impuesto,ImpEnFac,LoteId,TabLevel) VALUES('"+nFactura+"','1','"+Descripcion+"','"+Precio+"','0','1','"+nLote+"','1')", (error, results)=>{
            if(error){
                return reject(error);
            }
            return resolve(results);
        });
    });
};