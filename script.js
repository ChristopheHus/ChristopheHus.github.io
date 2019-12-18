window.addEventListener("load", setupWebGL, false);

var gl, canvas, program, buffer, programInfo;
var initTime;

function setupWebGL (evt)
{
	window.removeEventListener(evt.type, setupWebGL, false);
	
	if (!(gl = getRenderingContext())) return;

	const src = getShader();

	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader,src.vertex);
	gl.compileShader(vertexShader);
	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
	{
		console.log('An error occurred compiling the vertex shaders: ' + gl.getShaderInfoLog(vertexShader));
		gl.deleteShader(vertexShader);
		return;
	}
	
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader,src.fragment);
	gl.compileShader(fragmentShader);
	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
	{
		console.log('An error occurred compiling the fragment shader: ' + gl.getShaderInfoLog(fragmentShader));
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);
		return;
	}
	
	program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	gl.detachShader(program, vertexShader);
	gl.detachShader(program, fragmentShader);
	
	gl.deleteShader(vertexShader);
	gl.deleteShader(fragmentShader);
	
	if (!gl.getProgramParameter(program, gl.LINK_STATUS))
	{
		var linkErrLog = gl.getProgramInfoLog(program);
		cleanup();
		console.log("Shader program did not link successfully : ", linkErrLog);
		return;
	} 

	initializeAttributes();
	
	programInfo = {
		program: program,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(program, 'aVertexPosition'),
		},
		uniformLocations: {
			iResolution: gl.getUniformLocation(program, "iResolution"),
			iTime: gl.getUniformLocation(program, "iTime"),
		},
	};
	
	{
		const numComponents = 2;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.vertexAttribPointer(
			programInfo.attribLocations.vertexPosition,
			numComponents,
			type,
			normalize,
			stride,
			offset);
		gl.enableVertexAttribArray(
			programInfo.attribLocations.vertexPosition);
	}

	gl.useProgram(programInfo.program);
	
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
	gl.uniform2f(programInfo.uniformLocations.iResolution, canvas.width, canvas.height);
	
	initTime = Date.now();
	render();
}


function render()
{
	gl.uniform1f(programInfo.uniformLocations.iTime, (Date.now()-initTime)/1000.);

	const offset = 0;
	const vertexCount = 4;
	gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);

	requestAnimationFrame(render, canvas);
}

window.onbeforeunload = function(evt)
{
	cleanup();
}

function initializeAttributes()
{
	buffer = gl.createBuffer();

	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

	const positions = [
		-1.0,  1.0,
		1.0,  1.0,
		-1.0, -1.0,
		1.0, -1.0,
	];
	
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
}

function cleanup()
{
	gl.useProgram(null);
	if (buffer)
		gl.deleteBuffer(buffer);
	if (program) 
		gl.deleteProgram(program);
}

function getRenderingContext()
{
	canvas = document.querySelector("canvas");
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
	
	var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	
	if (!gl)
	{
		console.log("Failed to get WebGL context");
		return null;
	}
	gl.viewport(0, 0, 
	gl.drawingBufferWidth, gl.drawingBufferHeight);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	
	return gl;
}


function getShader()
{
	const vertexSrc = 
`
attribute vec4 aVertexPosition;

void main()
{
	gl_Position = aVertexPosition;
}
`;

	const fragmentSrc = 
`
precision mediump float;

const float PI = 3.1415926535897932384626433832795028841971693;

const vec4 n1 = vec4(-0.027444022037703, -0.092323445726082, 0.995350795962739, 0.);
const vec4 n2 = vec4( 0.958546250158684, -0.284936986554441, 0., 0.);

vec4 c1 = vec4(2., 3.45940626718, 0.02, 1.);
vec4 c2 = vec4(4., 1.6, .3, 1.);


uniform vec2 iResolution;
uniform float iTime;

vec4 linToS(vec4 linRGB)
{
	return mix(
			vec4(1.055)*pow(linRGB,vec4(1./2.4))-vec4(.055),
			vec4(12.92)*linRGB,
			vec4(lessThan(linRGB,vec4(.0031308)))
	);
}

vec4 getCubeHelix (vec4 value)
{
	vec4 lin = vec4(value.z);
	lin += value.x*lin*(vec4(1.)-lin) * (cos(value.y)*n1 + sin(value.y)*n2);
	lin.w = value.w;

	return clamp(linToS(lin),vec4(0.),vec4(1.));
}


vec4 getColor(float x)
{
	return getCubeHelix(c1*(1.-x) + c2*x);
}

void main()
{
	vec2 uv = gl_FragCoord.xy/iResolution;
	vec4 col = vec4(uv.x,uv.y,.5+.5*cos(2.*PI*iTime/10.),1.);
	gl_FragColor = col;
}
`;
	return {vertex:vertexSrc, fragment:fragmentSrc};
}