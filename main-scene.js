import {tiny, defs, Shape_From_File, Body} from './assignment-4-resources.js';
                                                                // Pull these names into this module's scope for convenience:
const { Vec, Mat, Mat4, Color, Light, Shape, Shader, Material, Texture,
         Scene, Canvas_Widget, Code_Widget, Text_Widget } = tiny;
const { Cube, Subdivision_Sphere, Transforms_Sandbox_Base, Kayak } = defs;

    // Now we have loaded everything in the files tiny-graphics.js, tiny-graphics-widgets.js, and assignment-4-resources.js.
    // This yielded "tiny", an object wrapping the stuff in the first two files, and "defs" for wrapping all the rest.

// (Can define Main_Scene's class here)

const Main_Scene =
class Kayak_Game extends Scene
{                                      
  constructor()
    {                  // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
      super();

      const Subdivision_Sphere_Flat = Subdivision_Sphere.prototype.make_flat_shaded_version();
                                                        // At the beginning of our program, load one of each of these shape
                                                        // definitions onto the GPU.  NOTE:  Only do this ONCE per shape.
                                                        // Don't define blueprints for shapes in display() every frame.
      Object.assign( this, { time_accumulator: 0, time_scale: 1, t: 0, dt: 1/20, bodies: [], steps_taken: 0 } );

                                               // list of shapes to be used in the scene
      this.shapes = { 'box' : new Cube(),
                   'ball_4' : new Subdivision_Sphere( 4 ),
                    'kayak' : new Kayak(),
                   'ball_6' : new Subdivision_Sphere(6),
                   'rock' : new Shape_From_File( "assets/Rock.obj" ),
                   'grass_block' : new Cube(),
                   'tree_stem' : new Shape_From_File( "assets/Tree.obj "),
                   'grass' : new Shape_From_File( "assets/Grass.obj" )
                   };



                                                              // *** Shaders ***

                                                              // NOTE: The 2 in each shader argument refers to the max
                                                              // number of lights, which must be known at compile time.

                                                              // A simple Phong_Blinn shader without textures:
      const phong_shader      = new defs.Phong_Shader  (2);
                                                              // Adding textures to the previous shader:
      const texture_shader    = new defs.Textured_Phong(2);
                                                              // Same thing, but with a trick to make the textures
                                                              // seemingly interact with the lights:
      const texture_shader_2  = new defs.Fake_Bump_Map (2);

                                              // *** Materials: *** wrap a dictionary of "options" for a shader.

                                              // Materials to be used for the scene
      this.materials = { plastic: new Material( phong_shader,
                                    { ambient: 0, diffusivity: 1, specularity: 0, color: Color.of( 1,1,1,1 ) } ),
                   plastic_stars: new Material( texture_shader_2,
                                    { texture: new Texture( "assets/stars.png" ),
                                      ambient: 0, diffusivity: 1, specularity: 0, color: Color.of( .4,.4,.4,1 ) } ),
                           metal: new Material( phong_shader,
                                    { ambient: 0, diffusivity: 1, specularity: 1, color: Color.of( 1,.5,1,1 ) } ),
                            rock: new Material( phong_shader,
                                    { ambient: 0, diffusivity: 1, specularity: 1, color: Color.of( .2, 1, 1, 1 ) } ),
                     metal_earth: new Material( texture_shader_2,
                                    { texture: new Texture( "assets/earth.gif" ),
                                      ambient: 0, diffusivity: 1, specularity: 1, color: Color.of( .4,.4,.4,1 ) } ),
                            kayak: new Material( phong_shader, { ambient: 1, color: Color.of( .8,0,0,1 ) } ),
                            body: new Material(phong_shader, {ambient: 1, color: Color.of(0,0,1,1)}),
                            skin: new Material(phong_shader, {ambient:1, color: Color.of(1,0.8,0.6,1)}),
                            grass_block: new Material(texture_shader,
                                         {
                                            texture: new Texture( "assets/grass.jpg" ),
                                            ambient: 1, diffusivity: 1, specularity: 1, color: Color.of( 0, 0.3, 0, 0.6)
                                         }),
                            rock: new Material( texture_shader,
                                    { texture: new Texture( "assets/rock.jpg" ),
                                      ambient: 1, diffusivity: 1, specularity: 1, color: Color.of( 101/255, 67/255, 33/255, 1 ) } ),

                            sky: new Material(texture_shader_2, {texture: new Texture("assets/sky.png"), ambient: 1, color: Color.of(0, .8, 1, 1)}),
                            flag: new Material(texture_shader, {texture: new Texture("assets/checker.jpg"), ambient:1, color: Color.of(1, 1, 1, 1)})
                       };

                                  // Some setup code that tracks whether the "lights are on" (the stars), and also
                                  // stores 30 random location matrices for drawing stars behind the solar system:

      this.rightPad = false;
      this.brakeRight = false;
      this.phase = 0;
      this.rp = 0;
      this.leftPad = false;
      this.brakeLeft = false;
      this.lp = 0;
      this.lights_on = false;

      this.kpos = Mat4.identity();
      this.linear_velocity = [0, 0, 0];      // linear velocity in x, y, z coords
      this.linear_acceleration = [0, 0, 0];
      this.angularVelocity = 0;
      this.curAngle = 0;
      this.t = 0;

      this.lapStart = 0;
      this.lapTime = 0;
      this.lapFinish = 0;
      this.checksPassed = 0;

      this.rmat = Mat4.identity();
      this.gpos = Mat4.identity();

      this.colliders = [
        { intersect_test: Body.intersect_sphere, points: new Shape_From_File( "assets/Rock.obj" ), leeway: .5 },
        { intersect_test: Body.intersect_sphere, points: new Shape_From_File( "assets/Rock.obj" ), leeway: .3 },
        { intersect_test: Body.intersect_sphere,   points: new Shape_From_File( "assets/Rock.obj" ), leeway: .1 }
                       ];
      this.collider_selection = 0;

      this.rock1 = new Body( this.shapes.rock, undefined, Vec.of( 1,5,1 ) )
            .emplace( Mat4.translation( Vec.of( 0,0,0 ).randomized(30) )
                      .times( Mat4.rotation( Math.PI, Vec.of( 0,0,0 ).randomized(1).normalized() ) ),
                      Vec.of( 0,0,0 ).randomized(20), Math.random() ) ;

      this.rock2 = new Body( this.shapes.rock, undefined, Vec.of( 1,5,1 ) )
            .emplace( Mat4.translation( Vec.of( 0,0,0 ).randomized(30) )
                      .times( Mat4.rotation( Math.PI, Vec.of( 0,0,0 ).randomized(1).normalized() ) ),
                      Vec.of( 0,0,0 ).randomized(20), Math.random() ) ;

      this.rock3 = new Body( this.shapes.rock, undefined, Vec.of( 1,5,1 ) )
            .emplace( Mat4.translation( Vec.of( 0,0,0 ).randomized(30) )
                      .times( Mat4.rotation( Math.PI, Vec.of( 0,0,0 ).randomized(1).normalized() ) ),
                      Vec.of( 0,0,0 ).randomized(20), Math.random() ) ;

      this.rock4 = new Body( this.shapes.rock, undefined, Vec.of( 1,5,1 ) )
            .emplace( Mat4.translation( Vec.of( 0,0,0 ).randomized(30) )
                      .times( Mat4.rotation( Math.PI, Vec.of( 0,0,0 ).randomized(1).normalized() ) ),
                      Vec.of( 0,0,0 ).randomized(20), Math.random() ) ;

      this.kayak = new Body( this.shapes.kayak, undefined, Vec.of( 1,5,1 ) )
            .emplace( Mat4.translation( Vec.of( 0,0,0 ).randomized(30) )
                      .times( Mat4.rotation( Math.PI, Vec.of( 0,0,0 ).randomized(1).normalized() ) ),
                      Vec.of( 0,0,0 ).randomized(20), Math.random() ) ;

      this.all_bodies = [
           this.rock1,
           this.rock2,
           this.rock3,
           this.rock4,
           this.kayak
      ];

    }
  make_control_panel()
    {                                 // make_control_panel(): Sets up a panel of interactive HTML elements, including
                                      // buttons with key bindings for affecting this scene, and live info readouts.
      this.key_triggered_button("Left Paddle Forward", [ "n" ], () =>  this.leftPad = (!this.rightPad && !this.brakeLeft && !this.brakeRight) );
      this.key_triggered_button("Right Paddle Forward", [ "m" ], () =>  this.rightPad = (!this.leftPad && !this.brakeLeft && !this.brakeRight) ); // ensure we don't call two paddles at the same time
      this.key_triggered_button("Left Paddle Backward", [ "x" ], () =>  this.brakeLeft = (!this.rightPad && !this.leftPad && !this.brakeRight) );
      this.key_triggered_button("Right Paddle Backward", [ "c" ], () =>  this.brakeRight = (!this.rightPad && !this.brakeLeft && !this.leftPad) );
      this.new_line();
      this.new_line();

      this.live_string( box => box.textContent = "Lap Time: " + this.lapTime.toFixed(2) );
      this.new_line();
      this.live_string( box => box.textContent = "Checkpoints: " + this.checksPassed + "/4" );

    }

  check() {
      const collider = this.colliders[ this.collider_selection ];

      for( let a of this.all_bodies )
      {                                                 // Cache the inverse of matrix of body "a" to save time.
          a.inverse = Mat4.inverse( a.drawn_location );

                                                      // *** Collision process is here ***
                                                      // Loop through all bodies again (call each "b"):
          for( let b of this.all_bodies )
          {
                                  // Pass the two bodies and the collision shape to check_if_colliding():
            if( !a.check_if_colliding( b, collider ) )
              continue;
                                          // If we get here, we collided, so turn red and zero out the
                                          // velocity so they don't inter-penetrate any further.
            console.log("HITTTT");
          }
      }
  }
  update_position() {   // calculate new position given the current velocity and acceleration
      let lax = this.linear_acceleration[0];
      let laz = this.linear_acceleration[2];
      let dragx = -1*this.linear_velocity[0]*.008;
      let dragz = -1*this.linear_velocity[2]*.0025;
      this.linear_velocity[0] += this.linear_acceleration[0] + dragx;
      this.linear_velocity[2] += this.linear_acceleration[2] + dragz;
      let dx = .05 * this.linear_velocity[0];
      let dz = .05 * this.linear_velocity[2];
      this.kpos.post_multiply(Mat4.translation ([dx, 0, dz]));
      this.kpos.post_multiply(Mat4.rotation(this.angularVelocity, Vec.of( 0,1,0 )));

      this.check();

      return null;
    }



  display( context, program_state )
    {                                                // display():  Called once per frame of animation.  For each shape that you want to
                                                     // appear onscreen, place a .draw() call for it inside.  Each time, pass in a
                                                     // different matrix value to control where the shape appears.

                           // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
      if( !context.scratchpad.controls )
        {                       // Add a movement controls panel to the page:
          this.children.push( context.scratchpad.controls = new defs.Movement_Controls() );

                                // Add a helper scene / child scene that allows viewing each moving body up close.
          this.children.push( this.camera_teleporter = new Camera_Teleporter() );

                    // Define the global camera and projection matrices, which are stored in program_state.  The camera
                    // matrix follows the usual format for transforms, but with opposite values (cameras exist as
                    // inverted matrices).  The projection matrix follows an unusual format and determines how depth is
                    // treated when projecting 3D points onto a plane.  The Mat4 functions perspective() and
                    // orthographic() automatically generate valid matrices for one.  The input arguments of
                    // perspective() are field of view, aspect ratio, and distances to the near plane and far plane.
          program_state.set_camera( Mat4.look_at( Vec.of( 0,10,20 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) ) );
          this.initial_camera_location = program_state.camera_inverse;
          program_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 200 );
        }

                                                                      // Find how much time has passed in seconds; we can use
                                                                      // time as an input when calculating new transforms:
      const t = program_state.animation_time / 1000;
      this.t = t;

                                                  // Have to reset this for each frame:
      this.camera_teleporter.cameras = [];
      //this.camera_teleporter.cameras.push( Mat4.look_at( Vec.of( 0,10,20 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) ) );


                                             // Variables that are in scope for you to use:
                                             // this.shapes: Your shapes, defined above.
                                             // this.materials: Your materials, defined above.
                                             // this.lights:  Assign an array of Light objects to this to light up your scene.
                                             // this.lights_on:  A boolean variable that changes when the user presses a button.
                                             // this.camera_teleporter: A child scene that helps you see your planets up close.
                                             //                         For this to work, you must push their inverted matrices
                                             //                         into the "this.camera_teleporter.cameras" array.
                                             // t:  Your program's time in seconds.
                                             // program_state:  Information the shader needs for drawing.  Pass to draw().
                                             // context:  Wraps the WebGL rendering context shown onscreen.  Pass to draw().



      const blue = Color.of( 0,0,.5,.6 ), yellow = Color.of( .5,.5,0,1 ), red = Color.of( 1, 0, .2, 1 ), skycol = Color.of(0, 0.8, 1, 1);

                                    // Variable model_transform will be a local matrix value that helps us position shapes.
                                    // It starts over as the identity every single frame - coordinate axes at the origin.
      let model_transform = Mat4.identity();

                                                // *** Lights: *** Values of vector or point lights.  They'll be consulted by
                                                // the shader when coloring shapes.  See Light's class definition for inputs.

                                        
      program_state.lights = [ new Light( Vec.of( 0,0,0,1 ), Color.of( 1,1,1,1 ), 100000 ) ];

                        
      const modifier = this.lights_on ? { ambient: 0.3 } : { ambient: 0.0 };


      // Lights for testing:
      const angle = -Math.PI/2;
      const light_position = Mat4.rotation( angle, [ 1,0,0 ] ).times( Vec.of( 0,-1,1,0 ) );
      program_state.lights = [ new Light( light_position, Color.of( 1,1,1,1 ), 1000000 ) ];

      this.update_position();

      let dt = 1/20;

      let kmat = this.kpos.copy();
      let cameraMat = kmat.copy();
      cameraMat.post_multiply(Mat4.translation ([0, 5, 15]));
      this.camera_teleporter.cameras.push(Mat4.inverse(cameraMat));


      const bob = -.4 + .1*Math.sin( 4*Math.PI*t ); // simple function to give the kayak the appearance that it is bobbing on the water
      kmat.post_multiply(Mat4.translation ([0, bob, 0]));

      this.kayak.shape.draw(context, program_state, kmat, this.materials.kayak);    // Draw the kayak in place

      kmat.post_multiply(Mat4.scale ([.9, 1.5, .6]));       // scale to torso shape
      kmat.post_multiply(Mat4.translation ([0, 1.2, .8]));   // move the torso to the position of sitting in kayak
      this.shapes.ball_6.draw(context, program_state, kmat, this.materials.body);
      kmat.post_multiply(Mat4.scale ([1/.9, 1/1.5, 1/.6])); // rescale torso
      let pmat = kmat.copy();                               // paddle matrix
      kmat.post_multiply(Mat4.translation ([0, 1.7, 0]));   // position of the kayaker's head
      kmat.post_multiply(Mat4.scale ([.6, .6, .6]));        // scale the head to be smaller
      this.shapes.ball_6.draw(context, program_state, kmat, this.materials.skin);


      /////////////////////////////////////////// CHECKPOINTS ////////////////////////////////////

      let cpm = Mat4.identity();
      cpm.post_multiply(Mat4.translation ([11, 0, -25]));
      cpm.post_multiply(Mat4.scale([.1, 3, .1]));
      cpm.post_multiply(Mat4.translation ([0, .9, 0]));
      this.shapes.box.draw(context, program_state, cpm, this.materials.plastic);
      cpm.post_multiply(Mat4.translation ([0, 1, 0]));
      cpm.post_multiply(Mat4.scale([1/.1, 1/3, 1]));
      cpm.post_multiply(Mat4.translation([-1, -1, 0]));
      this.shapes.box.draw(context, program_state, cpm, this.materials.flag.override(red));

      cpm = Mat4.identity();
      cpm.post_multiply(Mat4.translation ([-12, 0, -25]));
      cpm.post_multiply(Mat4.scale([.1, 3, .1]));
      cpm.post_multiply(Mat4.translation ([0, .9, 0]));
      this.shapes.box.draw(context, program_state, cpm, this.materials.plastic);
      cpm.post_multiply(Mat4.translation ([0, 1, 0]));
      cpm.post_multiply(Mat4.scale([1/.1, 1/3, 1]));
      cpm.post_multiply(Mat4.translation([1, -1, 0]));
      this.shapes.box.draw(context, program_state, cpm, this.materials.flag.override(red));

      if((this.kpos[0][3]>-12 && this.kpos[0][3]<11)&&(this.kpos[2][3]>-26 && this.kpos[2][3]<-24 && this.checksPassed==0)) {
         this.lapStart = t;
         this.checksPassed++;
         console.log(this.lapStart);
      }
      if((this.kpos[0][3]>-12 && this.kpos[0][3]<11)&&(this.kpos[2][3]>-26 && this.kpos[2][3]<-24 && this.checksPassed==4))
                  this.lapFinish = t;

      cpm = Mat4.identity();
      cpm.post_multiply(Mat4.translation ([86.25, 0, -20.63]));
      cpm.post_multiply(Mat4.scale([.1, 3, .1]));
      cpm.post_multiply(Mat4.translation ([0, .9, 0]));
      this.shapes.box.draw(context, program_state, cpm, this.materials.plastic);
      cpm.post_multiply(Mat4.translation ([0, 1, 0]));
      cpm.post_multiply(Mat4.scale([1/.1, 1/3, 1]));
      cpm.post_multiply(Mat4.translation([-1, -1, 0]));
      this.shapes.box.draw(context, program_state, cpm, this.materials.flag);

      cpm = Mat4.identity();
      cpm.post_multiply(Mat4.translation ([58.25, 0, -20.63]));
      cpm.post_multiply(Mat4.scale([.1, 3, .1]));
      cpm.post_multiply(Mat4.translation ([0, .9, 0]));
      this.shapes.box.draw(context, program_state, cpm, this.materials.plastic);
      cpm.post_multiply(Mat4.translation ([0, 1, 0]));
      cpm.post_multiply(Mat4.scale([1/.1, 1/3, 1]));
      cpm.post_multiply(Mat4.translation([1, -1, 0]));
      this.shapes.box.draw(context, program_state, cpm, this.materials.flag);

      if(this.checksPassed==1) {
            if((this.kpos[2][3]>-21 && this.kpos[2][3]<-19)&&(this.kpos[0][3]>58.25 && this.kpos[0][3]<86.25))
                  this.checksPassed++;
      }

      cpm = Mat4.identity();
      cpm.post_multiply(Mat4.translation ([345, 0, -26]));
      cpm.post_multiply(Mat4.scale([.1, 3, .1]));
      cpm.post_multiply(Mat4.translation ([0, .9, 0]));
      this.shapes.box.draw(context, program_state, cpm, this.materials.plastic);
      cpm.post_multiply(Mat4.translation ([0, 1, 0]));
      cpm.post_multiply(Mat4.scale([1, 1/3, 1/.1]));
      cpm.post_multiply(Mat4.translation([0, -1, -1]));
      this.shapes.box.draw(context, program_state, cpm, this.materials.flag);

      cpm = Mat4.identity();
      cpm.post_multiply(Mat4.translation ([345, 0, -66]));
      cpm.post_multiply(Mat4.scale([.1, 3, .1]));
      cpm.post_multiply(Mat4.translation ([0, .9, 0]));
      this.shapes.box.draw(context, program_state, cpm, this.materials.plastic);
      cpm.post_multiply(Mat4.translation ([0, 1, 0]));
      cpm.post_multiply(Mat4.scale([1, 1/3, 1/.1]));
      cpm.post_multiply(Mat4.translation([0, -1, 1]));
      this.shapes.box.draw(context, program_state, cpm, this.materials.flag);

      if(this.checksPassed==2) {
            if((this.kpos[2][3]>-66 && this.kpos[2][3]<-26)&&(this.kpos[0][3]>344 && this.kpos[0][3]<346))
                  this.checksPassed++;
      }

      cpm = Mat4.identity();
      cpm.post_multiply(Mat4.translation ([140, 0, 130]));
      cpm.post_multiply(Mat4.scale([.1, 3, .1]));
      cpm.post_multiply(Mat4.translation ([0, .9, 0]));
      this.shapes.box.draw(context, program_state, cpm, this.materials.plastic);
      cpm.post_multiply(Mat4.translation ([0, 1, 0]));
      cpm.post_multiply(Mat4.scale([1, 1/3, 1/.1]));
      cpm.post_multiply(Mat4.translation([0, -1, -1]));
      this.shapes.box.draw(context, program_state, cpm, this.materials.flag);

      cpm = Mat4.identity();
      cpm.post_multiply(Mat4.translation ([140, 0, 100]));
      cpm.post_multiply(Mat4.scale([.1, 3, .1]));
      cpm.post_multiply(Mat4.translation ([0, .9, 0]));
      this.shapes.box.draw(context, program_state, cpm, this.materials.plastic);
      cpm.post_multiply(Mat4.translation ([0, 1, 0]));
      cpm.post_multiply(Mat4.scale([1, 1/3, 1/.1]));
      cpm.post_multiply(Mat4.translation([0, -1, 1]));
      this.shapes.box.draw(context, program_state, cpm, this.materials.flag);

      if(this.checksPassed==3) {
            if((this.kpos[2][3]>100 && this.kpos[2][3]< 130)&&(this.kpos[0][3]>139 && this.kpos[0][3]<141))
                  this.checksPassed++;
      }

      if(this.lapStart != 0 && this.lapFinish==0) {
            this.lapTime = this.t - this.lapStart;
      }
      if(this.lapFinish != 0)
            this.lapTime = this.lapFinish - this.lapStart;

      ///////////////// END CHECKPOINTS /////////////////////////////////////

      ///////////// ROCKS ////////////

      let rpos = this.rmat.copy();

      rpos.post_multiply(Mat4.scale ([ 3, 3, 3 ]));
      rpos.post_multiply(Mat4.translation ([ 12/3, 0, -5/3 ]));
      this.rock1.shape.draw(context, program_state, rpos, this.materials.rock);

      rpos.post_multiply(Mat4.translation ([ -8.5, 0, -4]));
      this.rock2.shape.draw(context, program_state, rpos, this.materials.rock);

      rpos.post_multiply(Mat4.translation ([ 0, 0, -10]));
      this.rock3.shape.draw( context, program_state, rpos, this.materials.rock );

      rpos.post_multiply(Mat4.translation ([ 7, 0, -10]));
      this.rock4.shape.draw( context, program_state, rpos, this.materials.rock );



      ///////////// END ROCKS ////////////


      ///////////// GRASS ////////////

      let gmat = this.gpos.copy();
      let gmatRight = Mat4.identity();
      gmat.post_multiply(Mat4.translation([-43, 0, -5]));
      gmat.post_multiply(Mat4.scale ([20,2,10]));
      this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);
      gmat.post_multiply(Mat4.translation([0,0,-2/5]));
      this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);

      for(let i = 0; i < 4; i++) {
          gmat.post_multiply(Mat4.translation([0,0,-2]));
          this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);
      }

      gmat.post_multiply(Mat4.translation([0,0,8]));
      this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);

      for(let i = 0; i < 2; i++) {
          gmat.post_multiply(Mat4.translation([0,0,2]));
          this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);
      }

      gmat.post_multiply(Mat4.translation([-2,0,-4]));
      this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);

      for(let i = 0; i < 4; i++) {
          gmat.post_multiply(Mat4.translation([0,0,2]));
          this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);
      }

      gmat.post_multiply(Mat4.translation([0,0,-8]));

      for(let i = 0; i < 2; i++) {
          gmat.post_multiply(Mat4.translation([0,0,-2]));
          this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);
      }


      gmatRight.post_multiply(Mat4.translation([20, 0, -5]));
      gmatRight.post_multiply(Mat4.scale ([8,2,4]));
      this.shapes.grass.draw(context, program_state, gmatRight, this.materials.grass_block);
      gmatRight.post_multiply(Mat4.translation([0,0,-8]));
      this.shapes.grass.draw(context, program_state, gmatRight, this.materials.grass_block);

      gmatRight.post_multiply(Mat4.translation([0,0,24]));
      for(let i = 0; i < 12; i++) {
          gmatRight.post_multiply(Mat4.translation([0,0,-2]));
          this.shapes.grass.draw(context, program_state, gmatRight, this.materials.grass_block);
      }

      gmatRight.post_multiply(Mat4.translation([2,0,-3]));

      for(let i = 0; i < 12; i++) {
          gmatRight.post_multiply(Mat4.translation([0,0,2]));
          this.shapes.grass.draw(context, program_state, gmatRight, this.materials.grass_block);
      }

      for(let i = 0; i < 2; i++) {
          gmat.post_multiply(Mat4.translation([0, 0, -2]));
          this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);
      }

      let gmat2 = gmatRight.copy(); // contains left side of path
      gmat2.post_multiply(Mat4.scale ([20/8, 1, 10/4]));

      for(let i=0; i<4; i++) {
            this.shapes.grass.draw(context, program_state, gmat2, this.materials.grass_block);
            if(i!=3)
                  gmat2.post_multiply(Mat4.translation([2, 0, .3]));
      }

      for(let i = 0; i < 6; i++) { // upper row
          gmat.post_multiply(Mat4.translation([2, 0, 0]));
          this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);
      }

      gmat.post_multiply(Mat4.translation([-1, 0, 0]));

      for(let i = 0; i < 3; i++) {
          gmat.post_multiply(Mat4.translation([-.3, 0, 2]));
          this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);
      }

      for(let i = 0; i < 5; i++) {
          if(i<3) {
            gmat.post_multiply(Mat4.translation([1.5, 0, -2]));
            this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);
          }
          gmat2.post_multiply(Mat4.translation([1, 0, -1]));
          this.shapes.grass.draw(context, program_state, gmat2, this.materials.grass_block);

      }

      for(let i = 0; i < 7; i++) {
          gmat.post_multiply(Mat4.translation([2, 0, 0]));
          if(i==6)
             gmat.post_multiply(Mat4.translation([-1, 0, 0]));
          this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);

          if(i<2) {
             gmat2.post_multiply(Mat4.translation([2, 0, -.7]));
             this.shapes.grass.draw(context, program_state, gmat2, this.materials.grass_block);
          }
      }

      for(let i = 0; i < 7; i++) {
          gmat.post_multiply(Mat4.translation([0, 0, 2]));
          this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);
      }

      gmat.post_multiply(Mat4.scale([2, 1, 2]));
      gmat2.post_multiply(Mat4.scale([2, 1, 2]));

      for(let i = 0; i < 10; i++) {
          gmat.post_multiply(Mat4.translation([-.1, 0, 1]));
          this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);
          if(i<7) {
            gmat2.post_multiply(Mat4.translation([-.3, 0, 1]));
            this.shapes.grass.draw(context, program_state, gmat2, this.materials.grass_block);
          }
      }

      for(let i = 0; i < 5; i++) {
          gmat.post_multiply(Mat4.translation([-1, 0, 0]));
          this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);
      }

      gmat.post_multiply(Mat4.scale([1/2, 1, 1/2]));
      gmat2.post_multiply(Mat4.scale([1/2, 1, 1/2]));
      gmat2.post_multiply(Mat4.translation([0, 0, 2.5]));

      for(let i = 0; i < 5; i++) {
          gmat.post_multiply(Mat4.translation([-1, 0, -2]));
          this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);
          if(i<4) {
            gmat2.post_multiply(Mat4.translation([-1, 0, -2]));
            this.shapes.grass.draw(context, program_state, gmat2, this.materials.grass_block);
          }
      }

      gmat2.post_multiply(Mat4.translation([-3, 0, -2]));
      for(let i = 0; i < 6; i++) {
          gmat.post_multiply(Mat4.translation([-1, 0, 2]));
          this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);
          if(i<4) {
            gmat2.post_multiply(Mat4.translation([-1, 0, 2]));
            this.shapes.grass.draw(context, program_state, gmat2, this.materials.grass_block);
          }

      }

      for(let i = 0; i < 4; i++) {
          gmat.post_multiply(Mat4.translation([-1, 0, -2]));
          this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);
          gmat2.post_multiply(Mat4.translation([0, 0, -2]));
          this.shapes.grass.draw(context, program_state, gmat2, this.materials.grass_block);
      }

      for(let i = 0; i < 5; i++) {
          gmat.post_multiply(Mat4.translation([0, 0, -2]));
          this.shapes.grass.draw(context, program_state, gmat, this.materials.grass_block);
      }



      // ************************************ BORDER ******************************************
      let border = Mat4.identity();
      border.post_multiply(Mat4.translation([-100, 0, -100]));
      border.post_multiply(Mat4.scale ([50,20,4]));
      border.post_multiply(Mat4.translation([0, 0, 0]));
      for(let i = 0; i < 6; i++) {
          border.post_multiply(Mat4.translation([2, 0, 0]));
          if(i==5)
            border.post_multiply(Mat4.translation([-1.2, 0, 0]));
          this.shapes.grass.draw(context, program_state, border, this.materials.grass_block);
          border.post_multiply(Mat4.translation([0, 0, 100]));
          this.shapes.grass.draw(context, program_state, border, this.materials.grass_block);
          border.post_multiply(Mat4.translation([0, 0, -100]));
      }

      border.post_multiply(Mat4.translation([1, 0, -1]));
      border.post_multiply(Mat4.scale ([4/50,1,50/4]));
      for(let i=0; i<4; i++) {
          border.post_multiply(Mat4.translation([0, 0, 2]));
          this.shapes.grass.draw(context, program_state, border, this.materials.grass_block);
          border.post_multiply(Mat4.translation([-146, 0, 0]));
          this.shapes.grass.draw(context, program_state, border, this.materials.grass_block);
          border.post_multiply(Mat4.translation([146, 0, 0]));
      }


      ///////////// END GRASS ////////////

      ///////////// TREES ////////////

      let tree_mat = Mat4.identity();
      tree_mat.post_multiply(Mat4.translation([22, 3, -30]));

      this.shapes.tree_stem.draw(context, program_state, tree_mat, this.materials.plastic);

      for(let i = 0; i < 10; i++) {
          tree_mat.post_multiply(Mat4.translation([0, 0, 6]));

          this.shapes.tree_stem.draw(context, program_state, tree_mat, this.materials.plastic);
      }

      ///////////// END TREES ////////////




      pmat.post_multiply(Mat4.translation ([0, .45, -1]));

      // Right side paddle
      if(this.rightPad) {
        if(this.rp == 0) {
          this.rp = t + 1;
          this.phase = t%1;
        }
        if(t < this.rp) {
          var padz_angle = -.3 + .3*Math.cos(2*Math.PI*(t-this.phase));      // for right paddle, vary angle around z between 0 and -.6
          if(padz_angle < -.3) {          // We only want to accelerate when the paddle is in the water
              this.linear_acceleration[0] = -.004;
              this.linear_acceleration[2] = -1*.03;
              if(this.linear_velocity[2] > -1)
                    this.linear_acceleration[2] = -1*0.06;
              if(this.linear_velocity[0] > 0)
                 this.angularVelocity = .004;
              else
                this.angularVelocity = .008;
          }
          else {
              this.linear_acceleration[0] = 0;
              this.linear_acceleration[2] = 0;
              this.angularVelocity = 0;
          }
          pmat.post_multiply(Mat4.rotation(padz_angle, Vec.of( 0,0,1 )));
          var pady_angle = .5 * Math.sin(2*Math.PI*(t-this.phase));            // for either direction paddle, vary around y between -.4 and .4
          pmat.post_multiply(Mat4.rotation(pady_angle, Vec.of( 0,1,0 )));
        }
        else {
          this.rp = 0;
          this.phase = 0;
          this.rightPad = false;
          console.log(this.kpos);
        }
      }

      // Right side brake
      if(this.brakeRight) {
        if(this.rp == 0) {
          this.rp = t + 1;
          this.phase = t%1;
        }
        if(t < this.rp) {
          var padz_angle = -.3 + .3*Math.cos(2*Math.PI*(t-this.phase));      // for right paddle, vary angle around z between 0 and -.6
          if(padz_angle < -.3) {
              this.linear_acceleration[0] = .003;
              this.linear_acceleration[2] = 1*.015;
              this.angularVelocity = -.008;
          }
          else {
              this.linear_acceleration[0] = 0;
              this.linear_acceleration[2] = 0;
              this.angularVelocity = 0;
          }
          pmat.post_multiply(Mat4.rotation(padz_angle, Vec.of( 0,0,1 )));
          var pady_angle = -.5 * Math.sin(2*Math.PI*(t-this.phase));            // for either direction paddle, vary around y between -.4 and .4
          pmat.post_multiply(Mat4.rotation(pady_angle, Vec.of( 0,1,0 )));
        }
        else {
          this.rp = 0;
          this.phase = 0;
          this.brakeRight = false;
          console.log(this.kpos);
        }
      }

      // Left side paddle
      if(this.leftPad) {
        if(this.lp == 0) {
          this.lp = t + 1;
          this.phase = t%1;
        }
        if(t < this.lp) {
          var padz_angle = .3 - .3*Math.cos(2*Math.PI*(t-this.phase));      // for left paddle, vary angle around z between 0 and .6
          if(padz_angle > .3) {
              this.linear_acceleration[0] = .004;
              this.linear_acceleration[2] = -1*.03;
              if(this.linear_velocity[2] > -1) {
                    this.linear_acceleration[2] = -1*0.06;
              }
              if(this.linear_velocity[0] < 0)
                 this.angularVelocity = -.004;
              else
                this.angularVelocity = -.008;
          }
          else {
              this.linear_acceleration[0] = 0;
              this.linear_acceleration[2] = 0;
              this.angularVelocity = 0;
          }
          pmat.post_multiply(Mat4.rotation(padz_angle, Vec.of( 0,0,1 )));
          var pady_angle = -.5 * Math.sin(2*Math.PI*(t-this.phase));            // for either direction paddle, vary around y between -.4 and .4
          pmat.post_multiply(Mat4.rotation(pady_angle, Vec.of( 0,1,0 )));
        }
        else {
          this.lp = 0;
          this.phase = 0;
          this.leftPad = false;
          //console.log(this.t);
          console.log(this.kpos);
        }
      }

      // Left side brake
      if(this.brakeLeft) {
        if(this.lp == 0) {
          this.lp = t + 1;
          this.phase = t%1;
        }
        if(t < this.lp) {
          var padz_angle = .3 - .3*Math.cos(2*Math.PI*(t-this.phase));      // for left paddle, vary angle around z between 0 and .6
          if(padz_angle > .3) {
              this.linear_acceleration[0] = -.004;
              this.linear_acceleration[2] = 1*.02;
              this.angularVelocity = .008;
          }
          else {
              this.linear_acceleration[0] = 0;
              this.linear_acceleration[2] = 0;
              this.angularVelocity = 0;
          }
          pmat.post_multiply(Mat4.rotation(padz_angle, Vec.of( 0,0,1 )));
          var pady_angle = .5 * Math.sin(2*Math.PI*(t-this.phase));            // for either direction paddle, vary around y between -.4 and .4
          pmat.post_multiply(Mat4.rotation(pady_angle, Vec.of( 0,1,0 )));
        }
        else {
          this.lp = 0;
          this.phase = 0;
          this.brakeLeft = false;
          //console.log(this.t);
          console.log(this.kpos);
        }
      }

      pmat.post_multiply(Mat4.scale([5, .1, .1]));    // shape of the handle of the paddle
      this.shapes.box.draw(context, program_state, pmat, this.materials.plastic);
      pmat.post_multiply(Mat4.scale([1/5, 1/.1, 1/.1]));

      pmat.post_multiply(Mat4.translation([-.9, 0, 0]));      // draw two hands to hold the paddle
      pmat.post_multiply(Mat4.scale([.25, .25, .25]));
      this.shapes.ball_6.draw(context, program_state, pmat, this.materials.skin);
      pmat.post_multiply(Mat4.translation([4*1.8, 0, 0]));
      this.shapes.ball_6.draw(context, program_state, pmat, this.materials.skin);
      pmat.post_multiply(Mat4.translation([-2*1.8, 0, 0]))
      pmat.post_multiply(Mat4.scale([1/.25, 1/.25, 1/.25]));


      pmat.post_multiply(Mat4.scale([5, .1, .1]));          // draw the paddles on either end of the long box
      pmat.post_multiply(Mat4.translation([-1, 0, 0]));
      pmat.post_multiply(Mat4.scale([.9/5, .75/.1, 1]));
      this.shapes.ball_4.draw(context, program_state, pmat, this.materials.body);
      pmat.post_multiply(Mat4.translation([2*5/.9, 0, 0]));
      this.shapes.ball_4.draw(context, program_state, pmat, this.materials.body);

      model_transform = Mat4.identity();                    // draw the ocean
      model_transform.post_multiply(Mat4.scale ([100, 10, 100]));
      model_transform.post_multiply(Mat4.translation ([0, -1, 0]));
      this.shapes.box.draw(context, program_state, model_transform, this.materials.plastic.override(blue)); // slightly transparent blue color for water
      model_transform.post_multiply(Mat4.translation ([2, 0, 0]));
      this.shapes.box.draw(context, program_state, model_transform, this.materials.plastic.override(blue));
      model_transform.post_multiply(Mat4.translation ([2, 0, 0]));
      this.shapes.box.draw(context, program_state, model_transform, this.materials.plastic.override(blue));
      model_transform.post_multiply(Mat4.translation ([0, 0, 2]));
      this.shapes.box.draw(context, program_state, model_transform, this.materials.plastic.override(blue));
      model_transform.post_multiply(Mat4.translation ([-2, 0, 0]));
      this.shapes.box.draw(context, program_state, model_transform, this.materials.plastic.override(blue));
      model_transform.post_multiply(Mat4.translation ([-2, 0, 0]));
      this.shapes.box.draw(context, program_state, model_transform, this.materials.plastic.override(blue));
      model_transform.post_multiply(Mat4.scale ([1/100, 10, 1/100]));

      let sky = Mat4.identity();
      sky.post_multiply(Mat4.translation ([200, 0, 100]));
      sky.post_multiply(Mat4.scale ([300, 80, 200]));
      this.shapes.box.draw(context, program_state, sky, this.materials.sky);

    }

}

const Additional_Scenes = [];

export { Main_Scene, Additional_Scenes, Canvas_Widget, Code_Widget, Text_Widget, defs }


const Camera_Teleporter = defs.Camera_Teleporter =
class Camera_Teleporter extends Scene
{                               // **Camera_Teleporter** is a helper Scene meant to be added as a child to
                                // your own Scene.  It adds a panel of buttons.  Any matrices externally
                                // added to its "this.cameras" can be selected with these buttons. Upon
                                // selection, the program_state's camera matrix slowly (smoothly)
                                // linearly interpolates itself until it matches the selected matrix.
  constructor()
    { super();
      this.cameras = [];
      this.selection = 0;
      this.enabled = true;
    }
  make_control_panel()
    {                                // make_control_panel(): Sets up a panel of interactive HTML elements, including
                                     // buttons with key bindings for affecting this scene, and live info readouts.

      this.key_triggered_button(  "Enable",       [ "e" ], () => this.enabled = true  );
      this.key_triggered_button( "Disable", [ "Shift", "E" ], () => this.enabled = false );
    }
  increase() { this.selection = Math.min( this.selection + 1, Math.max( this.cameras.length-1, 0 ) ); }
  decrease() { this.selection = Math.max( this.selection - 1, 0 ); }   // Don't allow selection of negative indices.
  display( context, program_state )
  {
    const desired_camera = this.cameras[ this.selection ];
    if( !desired_camera || !this.enabled )
      return;
    const dt = program_state.animation_delta_time;
    program_state.set_camera( desired_camera.map( (x,i) => Vec.from( program_state.camera_inverse[i] ).mix( x, .01*dt ) ) );
  }
}
