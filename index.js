/*
		
		RDK plugin for JsPsych
    ----------------------
		
		This code was created in the Consciousness and Metacognition Lab at UCLA, 
		under the supervision of Brian Odegaard and Hakwan Lau
    
    ----------------------
    
		Copyright (C) 2017  Sivananda Rajananda
    		
		This program is free software: you can redistribute it and/or modify
		it under the terms of the GNU General Public License as published by
		the Free Software Foundation, either version 3 of the License, or
		(at your option) any later version.
		
		This program is distributed in the hope that it will be useful,
		but WITHOUT ANY WARRANTY; without even the implied warranty of
		MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
		GNU General Public License for more details.
		
		You should have received a copy of the GNU General Public License
		along with this program.  If not, see <http://www.gnu.org/licenses/>.
		
*/

//--------------------------------------
//---------SET PARAMETERS BEGIN---------
//--------------------------------------

var startTime = 0;

var nDots = 300; //Number of dots per set (equivalent to number of dots per frame)
var nSets = 1; //Number of sets to cycle through per frame
var coherentDirection = 123; //The direction of the coherentDots in degrees. Starts at 3 o'clock and goes counterclockwise (0 == rightwards, 90 == upwards, 180 == leftwards, 270 == downwards), range 0 - 360
var coherence = 0.5; //Proportion of dots to move together, range from 0 to 1
var dotRadius = 2; //Radius of each dot in pixels
var dotLife = -1;//How many frames a dot will keep following its trajectory before it is redrawn at a random location. -1 denotes infinite life (the dot will only be redrawn if it reaches the end of the aperture).
var moveDistance = 1; //How many pixels the dots move per frame
var apertureWidth = 400; // How many pixels wide the aperture is. For square aperture this will be the both height and width. For circle, this will be the diameter.
var apertureHeight = 300; //How many pixels high the aperture is. Only relevant for ellipse and rectangle apertures. For circle and square, this is ignored.
var dotColor = "white"; //Color of the dots
var backgroundColor = "gray"; //Color of the background
var apertureCenterX = window.innerWidth/2; // The x-coordinate of center of the aperture on the screen, in pixels
var apertureCenterY = window.innerHeight/2; // The y-coordinate of center of the aperture on the screen, in pixels


/* RDK type parameter
** See Fig. 1 in Scase, Braddick, and Raymond (1996) for a visual depiction of these different signal selection rules and noise types

-------------------
SUMMARY:

Signal Selection rule:
-Same: Each dot is designated to be either a coherent dot (signal) or incoherent dot (noise) and will remain so throughout all frames in the display. Coherent dots will always move in the direction of coherent motion in all frames.
-Different: Each dot can be either a coherent dot (signal) or incoherent dot (noise) and will be designated randomly (weighted based on the coherence level) at each frame. Only the dots that are designated to be coherent dots will move in the direction of coherent motion, but only in that frame. In the next frame, each dot will be designated randomly again on whether it is a coherent or incoherent dot.

Noise Type:
-Random position: The incoherent dots are in a random location in the aperture in each frame
-Random walk: The incoherent dots will move in a random direction (designated randomly in each frame) in each frame.
-Random direction: Each incoherent dot has its own alternative direction of motion (designated randomly at the beginning of the trial), and moves in that direction in each frame.

-------------------

 1 - same && random position
 2 - same && random walk
 3 - same && random direction
 4 - different && random position
 5 - different && random walk
 6 - different && random direction         */

var RDK = 3;


/* 
Shape of aperture
 1 - Circle
 2 - Ellipse
 3 - Square
 4 - Rectangle
*/
var apertureType = 2;

/*
Out of Bounds Decision
How we reinsert a dot that has moved outside the edges of the aperture:
1 - Randomly appear anywhere in the aperture
2 - Randomly appear on the opposite edge of the aperture
*/
var reinsertType = 2;

//FixationCrossParameters
var fixationCross = true; //To display or not to display the cross
var fixationCrossWidth = 20; //The width of the fixation cross in pixels
var fixationCrossHeight = 20; //The height of the fixation cross in pixels
var fixationCrossColor = "black"; //The color of the fixation cross
var fixationCrossThickness = 1; //The thickness of the fixation cross, must be positive number above 1


//--------------------------------------
//----------SET PARAMETERS END----------
//--------------------------------------

// CCapture setting
var cpaturer;
var framerate = 60;

capturer = new CCapture( {
	verbose: false,
	display: true,
	framerate: framerate,
	motionBlurFrames: ( 960 / framerate ) * ( false ? 1 : 0 ),
	quality: 99,
	// format: webm, gif, png, jpg, webm-mediarecorder
	format: 'webm',
	workersPath: './src/',
	timeLimit: 3,
	frameLimit: 0,
	autoSaveTime: 0,
	// onProgress: function( p ) { progress.style.width = ( p * 100 ) + '%' }
} );

function startCapture() {
	capturer.start();
}

function endCapture() {
	capturer.stop();
	capturer.save();
}


//------Set up canvas begin---------

//Initialize the canvas variable so that it can be used in code below.
var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
/*
canvas.style.width = "1920px";
canvas.style.height = "1080px";
*/

//Declare variables for width and height, and also set the canvas width and height to the window width and height
var width = canvas.width = window.innerWidth;
var height = canvas.height = window.innerHeight;

//Set the canvas background color
canvas.style.backgroundColor = backgroundColor;

//------Set up canvas end---------

//--------RDK variables and function calls begin--------

// [This is the main part of RDK that makes everything run]

//Declare aperture parameters for initialization based on shape (used in initializeApertureParameters function below)
var horizontalAxis;
var verticalAxis;

//Initialize the aperture parameters
initializeApertureParameters();

//Calculate the x and y jump sizes for coherent dots
var coherentJumpSizeX = calculateCoherentJumpSizeX(coherentDirection);
var coherentJumpSizeY = calculateCoherentJumpSizeY(coherentDirection);

//Calculate the number of coherent and incoherent dots
var nCoherentDots = nDots * coherence;
var nIncoherentDots = nDots - nCoherentDots;

//Make the array of arrays containing dot objects
var dotArray2d = makeDotArray2d();

var dotArray; //Declare a global variable to hold the current array
var currentSet = 0; //Declare and initialize a global variable to cycle through the dot arrays

//Initialize stopping condition for animateDotMotion function that runs in a loop
var stopDotMotion = false;

//This runs the dot motion simulation, updating it according to the frame refresh rate of the screen.
animateDotMotion();

//--------RDK variables and function calls end--------


//---------------------------------------
//-----------FUNCTIONS BEGIN-------------
//---------------------------------------

//Calculate coherent jump size in the x direction
		function calculateCoherentJumpSizeX(coherentDirection) {
			var angleInRadians = coherentDirection * Math.PI / 180;
			return moveDistance * Math.cos(angleInRadians);
		}

		//Calculate coherent jump size in the y direction
		function calculateCoherentJumpSizeY(coherentDirection) {
			var angleInRadians = -coherentDirection * Math.PI / 180; //Negative sign because the y-axis is flipped on screen
			return moveDistance * Math.sin(angleInRadians);
		}

		//Initialize the parameters for the aperture for further calculation
		function initializeApertureParameters() {
			//For circle and square
			if (apertureType == 1 || apertureType == 3) {
				horizontalAxis = verticalAxis = apertureWidth / 2;
			}
			//For ellipse and rectangle
			else if (apertureType == 2 || apertureType == 4) {
				horizontalAxis = apertureWidth / 2;
				verticalAxis = apertureHeight / 2;
			}
		}

		//Make the 2d array, which is an array of array of dots
		function makeDotArray2d() {
			//Declare an array to hold the sets of dot arrays
			var tempArray = []
			//Loop for each set of dot array
			for (var i = 0; i < nSets; i++) {
				tempArray.push(makeDotArray()); //Make a dot array and push it into the 2d array
			}

			return tempArray;
		}

		//Make the dot array
		function makeDotArray() {
			var tempArray = []
			for (var i = 0; i < nDots; i++) {
				//Initialize a dot to be modified and inserted into the array
				var dot = {
					x: 0, //x coordinate
					y: 0, //y coordinate
					vx: 0, //coherent x jumpsize (if any)
					vy: 0, //coherent y jumpsize (if any)
					vx2: 0, //incoherent (random) x jumpsize (if any)
					vy2: 0, //incoherent (random) y jumpsize (if any)
					latestXMove: 0, //Stores the latest x move direction for the dot (to be used in reinsertOnOppositeEdge function below)
					latestYMove: 0, //Stores the latest y move direction for the dot (to be used in reinsertOnOppositeEdge function below)
					lifeCount: Math.floor(randomNumberBetween(0, dotLife)), //Counter for the dot's life. Updates every time it is shown in a frame
					updateType: "" //String to determine how this dot is updated
				}
				//randomly set the x and y coordinates
				dot = resetLocation(dot);

				//For the same && random position RDK type
				if (RDK == 1) {
					//For coherent dots
					if (i < nCoherentDots) {
						dot = setvxvy(dot); // Set dot.vx and dot.vy
						dot.updateType = "constant direction";
					}
					//For incoherent dots
					else {
						dot.updateType = "random position";
					}
				} //End of RDK==1

				//For the same && random walk RDK type
				if (RDK == 2) {
					//For coherent dots
					if (i < nCoherentDots) {
						dot = setvxvy(dot); // Set dot.vx and dot.vy
						dot.updateType = "constant direction";
					}
					//For incoherent dots
					else {
						dot.updateType = "random walk";
					}
				} //End of RDK==2

				//For the same && random direction RDK type
				if (RDK == 3) {
					//For coherent dots
					if (i < nCoherentDots) {
						dot = setvxvy(dot); // Set dot.vx and dot.vy
						dot.updateType = "constant direction";
					}
					//For incoherent dots
					else {
						setvx2vy2(dot); // Set dot.vx2 and dot.vy2
						dot.updateType = "random direction";
					}
				} //End of RDK==3

				//For the different && random position RDK type
				if (RDK == 4) {
					//For all dots
					dot = setvxvy(dot); // Set dot.vx and dot.vy
					dot.updateType = "constant direction or random position";
				} //End of RDK==4

				//For the different && random walk RDK type
				if (RDK == 5) {
					//For all dots
					dot = setvxvy(dot); // Set dot.vx and dot.vy
					dot.updateType = "constant direction or random walk";
				} //End of RDK==5

				//For the different && random direction RDK type
				if (RDK == 6) {
					//For all dots
					dot = setvxvy(dot); // Set dot.vx and dot.vy
					//Each dot will have its own alternate direction of motion
					setvx2vy2(dot); // Set dot.vx2 and dot.vy2
					dot.updateType = "constant direction or random direction";
				} //End of RDK==6

				tempArray.push(dot);
			} //End of for loop
			return tempArray;
		}

		//Draw the dots on the canvas after they're updated
		function draw() {
      
			//Clear the canvas to draw new dots
			ctx.clearRect(0, 0, width, height)
			ctx.fillStyle="gray";
			ctx.fillRect(0, 0, width, height);
      
			//Loop through the dots one by one and draw them
			for (var i = 0; i < nDots; i++) {
				dot = dotArray[i];
				ctx.beginPath();
				ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
				ctx.fillStyle = dotColor;
				ctx.fill();
			}
      
      //Draw the fixation cross if we want it
      if(fixationCross === true){
        
        //Horizontal line
        ctx.beginPath();
        ctx.lineWidth = fixationCrossThickness;
        ctx.moveTo(width/2 - fixationCrossWidth, height/2);
        ctx.lineTo(width/2 + fixationCrossWidth, height/2);
        ctx.fillStyle = fixationCrossColor;
        ctx.stroke();
        
        //Vertical line
        ctx.beginPath();
        ctx.lineWidth = fixationCrossThickness;
        ctx.moveTo(width/2, height/2 - fixationCrossHeight);
        ctx.lineTo(width/2, height/2 + fixationCrossHeight);
        ctx.fillStyle = fixationCrossColor;
        ctx.stroke();
      }
      
		}

		//Update the dots with their new location
		function updateDots() {
			
			//Cycle through to the next set of dots
			if (currentSet == nSets - 1) {
				currentSet = 0;
			} else {
				currentSet++;
			}
			
			//Load in the current set of dot array for easy handling
			dotArray = dotArray2d[currentSet]; //Global variable, so the draw function also uses this array

			//Loop through the dots one by one and update them accordingly
			for (var i = 0; i < nDots; i++) {
				var dot = dotArray[i]; //Load the current dot into the variable for easy handling

				//Update based on the dot's update type
				if (dot.updateType == "constant direction") {
					dot = constantDirectionUpdate(dot);
				} else if (dot.updateType == "random position") {
					dot = resetLocation(dot);
				} else if (dot.updateType == "random walk") {
					dot = randomWalkUpdate(dot);
				} else if (dot.updateType == "random direction") {
					dot = randomDirectionUpdate(dot);
				} else if (dot.updateType == "constant direction or random position") {
					//Randomly select if the dot goes in a constant direction or random position, weighted based on the coherence level
					if (Math.random() < coherence) {
						dot = constantDirectionUpdate(dot);
					} else {
						dot = resetLocation(dot);
					}
				} else if (dot.updateType == "constant direction or random walk") {
					//Randomly select if the dot goes in a constant direction or random walk, weighted based on the coherence level
					if (Math.random() < coherence) {
						dot = constantDirectionUpdate(dot);
					} else {
						dot = randomWalkUpdate(dot);
					}
				} else if (dot.updateType == "constant direction or random direction") {
					//Randomly select if the dot goes in a constant direction or random direction, weighted based on the coherence level
					if (Math.random() < coherence) {
						dot = constantDirectionUpdate(dot);
					} else {
						dot = randomDirectionUpdate(dot);
					}
				}

				//Increment the life count
				dot.lifeCount++;

				//Check if out of bounds or if life ended
				if (lifeEnded(dot)) {
					dot = resetLocation(dot);
				}

				//If it goes out of bounds, do what is necessary (reinsert randomly or reinsert on the opposite edge) based on the parameter chosen
				if (outOfBounds(dot)) {
					switch (reinsertType) {
						case 1:
							dot = resetLocation(dot);
							break;
						case 2:
							dot = reinsertOnOppositeEdge(dot);
							break;
					} //End of switch statement
				} //End of if

			} //End of for loop
		} //End of updateDots function

		//Function to check if dot life has ended
		function lifeEnded(dot) {
			//If we want infinite dot life
			if (dotLife < 0) {
				dot.lifeCount = 0; //resetting to zero to save memory. Otherwise it might increment to huge numbers.
				return false;
			}
			//Else if the dot's life has reached its end
			else if (dot.lifeCount >= dotLife) {
				dot.lifeCount = 0;
				return true;
			}
			//Else the dot's life has not reached its end
			else {
				return false;
			}
		}

		//Function to check if dot is out of bounds
		function outOfBounds(dot) {
			//For circle and ellipse
			if (apertureType == 1 || apertureType == 2) {
				if (dot.x < xValueNegative(dot.y) || dot.x > xValuePositive(dot.y) || dot.y < yValueNegative(dot.x) || dot.y > yValuePositive(dot.x)) {
					return true;
				} else {
					return false;
				}
			}
			//For square and rectangle
			if (apertureType == 3 || apertureType == 4) {
				if (dot.x < (apertureCenterX) - horizontalAxis || dot.x > (apertureCenterX) + horizontalAxis || dot.y < (apertureCenterY) - verticalAxis || dot.y > (apertureCenterY) + verticalAxis) {
					return true;
				} else {
					return false;
				}
			}

		}

		//Set the vx and vy for the dot to the coherent jump sizes of the X and Y directions
		function setvxvy(dot) {
			dot.vx = coherentJumpSizeX;
			dot.vy = coherentJumpSizeY;
			return dot;
		}

		//Set the vx2 and vy2 based on a random angle
		function setvx2vy2(dot) {
			//Generate a random angle of movement
			var theta = randomNumberBetween(-Math.PI, Math.PI);
			//Update properties vx2 and vy2 with the alternate directions
			dot.vx2 = Math.cos(theta) * moveDistance;
			dot.vy2 = -Math.sin(theta) * moveDistance;
			return dot;
		}

		//Updates the x and y coordinates by moving it in the x and y coherent directions
		function constantDirectionUpdate(dot) {
			dot.x += dot.vx;
			dot.y += dot.vy;
			dot.latestXMove = dot.vx;
			dot.latestYMove = dot.vy;
			return dot;
		}

		//Creates a new angle to move towards and updates the x and y coordinates
		function randomWalkUpdate(dot) {
			//Generate a random angle of movement
			var theta = randomNumberBetween(-Math.PI, Math.PI);
			//Generate the movement from the angle
			dot.latestXMove = Math.cos(theta) * moveDistance;
			dot.latestYMove = -Math.sin(theta) * moveDistance;
			//Update x and y coordinates with the new location
			dot.x += dot.latestXMove;
			dot.y += dot.latestYMove;
			return dot;
		}

		//Updates the x and y coordinates with the alternative move direction
		function randomDirectionUpdate(dot) {
			dot.x += dot.vx2;
			dot.y += dot.vy2;
			dot.latestXMove = dot.vx2;
			dot.latestYMove = dot.vy2;
			return dot;
		}

		//Calculates a random position on the opposite edge to reinsert the dot
		function reinsertOnOppositeEdge(dot) {
			//If it is a circle or ellipse
			if (apertureType == 1 || apertureType == 2) {
				//Bring the dot back into the aperture by moving back one step
				dot.x -= dot.latestXMove;
				dot.y -= dot.latestYMove;

				//Move the dot to the position relative to the origin to be reflected about the origin
				dot.x -= apertureCenterX;
				dot.y -= apertureCenterY;

				//Reflect the dot about the origin
				dot.x = -dot.x;
				dot.y = -dot.y;

				//Move the dot back to the center of the screen
				dot.x += apertureCenterX;
				dot.y += apertureCenterY;

			} //End of if apertureType == 1 | == 2

			//If it is a square or rectangle, re-insert on one of the opposite edges
			if (apertureType == 3 || apertureType == 4) {

				/* The formula for calculating whether a dot appears from the vertical edge (left or right edges) is dependent on the direction of the dot and the ratio of the vertical and horizontal edge lengths.
				E.g.  
				Aperture is 100 px high and 200px wide
				Dot is moving 3 px in x direction and 4px in y direction
				Weight on vertical edge (sides)           = (100/(100+200)) * (|3| / (|3| + |4|)) = 1/7
				Weight on horizontal edge (top or bottom) = (200/(100+200)) * (|4| / (|3| + |4|)) = 8/21
			
				The weights above are the ratios to one another.
				E.g. (cont.)
				Ratio (vertical edge : horizontal edge) == (1/7 : 8/21)
				Total probability space = 1/7 + 8/21 = 11/21
				Probability that dot appears on vertical edge   = (1/7)/(11/21) = 3/11
				Probability that dot appears on horizontal edge = (8/21)/(11/21) = 8/11
				*/

				//Get the absolute values of the latest X and Y moves and store them in variables for easy handling.
				var absX = Math.abs(dot.latestXMove);
				var absY = Math.abs(dot.latestYMove);
				//Calculate the direction weights based on direction the dot was moving
				var weightInXDirection = absX / (absX + absY);
				var weightInYDirection = absY / (absX + absY);
				//Calculate the weight of the edge the dot should appear from, based on direction of dot and ratio of the aperture edges
				var weightOnVerticalEdge = (verticalAxis / (verticalAxis + horizontalAxis)) * weightInXDirection;
				var weightOnHorizontalEdge = (horizontalAxis / (verticalAxis + horizontalAxis)) * weightInYDirection;


				//Generate a bounded random number to determine if the dot should appear on the vertical edge or the horizontal edge
				if (weightOnVerticalEdge > (weightOnHorizontalEdge + weightOnVerticalEdge) * Math.random()) { //If yes, appear on the left or right edge (vertical edge)
					if (dot.latestXMove < 0) { //If dots move left, appear on right edge
						dot.x = apertureCenterX + horizontalAxis;
						dot.y = randomNumberBetween((apertureCenterY) - verticalAxis, (apertureCenterY) + verticalAxis);
					} else { //Else dots move right, so they should appear on the left edge
						dot.x = apertureCenterX - horizontalAxis;
						dot.y = randomNumberBetween((apertureCenterY) - verticalAxis, (apertureCenterY) + verticalAxis);
					}
				} else { //Else appear on the top or bottom edge (horizontal edge)
					if (dot.latestYMove < 0) { //If dots move upwards, then appear on bottom edge
						dot.y = apertureCenterY + verticalAxis;
						dot.x = randomNumberBetween((apertureCenterX) - horizontalAxis, (apertureCenterX) + horizontalAxis)
					} else { //If dots move downwards, then appear on top edge
						dot.y = apertureCenterY - verticalAxis;
						dot.x = randomNumberBetween((apertureCenterX) - horizontalAxis, (apertureCenterX) + horizontalAxis)
					}
				}
			} //End of apertureType == 3
			return dot;
		} //End of reinsertOnOppositeEdge

		//Calculate the POSITIVE y value of a point on the edge of the ellipse given an x-value
		function yValuePositive(x) {
			var x = x - (apertureCenterX); //Bring it back to the (0,0) center to calculate accurately (ignore the y-coordinate because it is not necessary for calculation)
			return verticalAxis * Math.sqrt(1 - (Math.pow(x, 2) / Math.pow(horizontalAxis, 2))) + apertureCenterY; //Calculated the positive y value and added height/2 to recenter it on the screen 
		}

		//Calculate the NEGATIVE y value of a point on the edge of the ellipse given an x-value
		function yValueNegative(x) {
			var x = x - (apertureCenterX); //Bring it back to the (0,0) center to calculate accurately (ignore the y-coordinate because it is not necessary for calculation)
			return -verticalAxis * Math.sqrt(1 - (Math.pow(x, 2) / Math.pow(horizontalAxis, 2))) + apertureCenterY; //Calculated the negative y value and added height/2 to recenter it on the screen
		}

		//Calculate the POSITIVE x value of a point on the edge of the ellipse given a y-value
		function xValuePositive(y) {
			var y = y - (apertureCenterY); //Bring it back to the (0,0) center to calculate accurately (ignore the x-coordinate because it is not necessary for calculation)
			return horizontalAxis * Math.sqrt(1 - (Math.pow(y, 2) / Math.pow(verticalAxis, 2))) + apertureCenterX; //Calculated the positive x value and added width/2 to recenter it on the screen
		}

		//Calculate the NEGATIVE x value of a point on the edge of the ellipse given a y-value
		function xValueNegative(y) {
			var y = y - (apertureCenterY); //Bring it back to the (0,0) center to calculate accurately (ignore the x-coordinate because it is not necessary for calculation)
			return -horizontalAxis * Math.sqrt(1 - (Math.pow(y, 2) / Math.pow(verticalAxis, 2))) + apertureCenterX; //Calculated the negative x value and added width/2 to recenter it on the screen
		}

		//Calculate a random x and y coordinate in the ellipse
		function resetLocation(dot) {

			//For circle and ellipse
			if (apertureType == 1 || apertureType == 2) {
				var phi = randomNumberBetween(-Math.PI, Math.PI);
				var rho = Math.random();

				x = Math.sqrt(rho) * Math.cos(phi);
				y = Math.sqrt(rho) * Math.sin(phi);

				x = x * horizontalAxis + apertureCenterX;
				y = y * verticalAxis + apertureCenterY;

				dot.x = x;
				dot.y = y;
			}
			//For square and rectangle
			else if (apertureType == 3 || apertureType == 4) {
				dot.x = randomNumberBetween((apertureCenterX) - horizontalAxis, (apertureCenterX) + horizontalAxis); //Between the left and right edges of the square / rectangle
				dot.y = randomNumberBetween((apertureCenterY) - verticalAxis, (apertureCenterY) + verticalAxis); //Between the top and bottom edges of the square / rectangle
			}

			return dot;
		}

		//Generates a random number (with decimals) between 2 values
		function randomNumberBetween(lowerBound, upperBound) {
			return lowerBound + Math.random() * (upperBound - lowerBound);
		}
		
		//Function to make the dots move on the canvas
		function animateDotMotion() {
			//frameRequestID saves a long integer that is the ID of this frame request. The ID is then used to terminate the request below.
			var frameRequestID = window.requestAnimationFrame(animate);
		
			function animate() {
				//If stopping condition has been reached, then stop the animation
				if (stopDotMotion) {
					window.cancelAnimationFrame(frameRequestID); //Cancels the frame request
				}
				//Else continue with another frame request
				else {
					updateDots(); //Update the dots to their new positions
					draw(); //Draw the dots on the canvas
					frameRequestID = window.requestAnimationFrame(animate); //Calls for another frame request

					// capture frame					
					if( capturer ) capturer.capture( canvas );
					
				}
				
			}
		}

//-------------------------------------
//-----------FUNCTIONS END-------------
//-------------------------------------