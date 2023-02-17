import headshot from '../assets/headshot.png'

const Headshot = (props) => {
    return (
        <div className="headshotContainer">
            <img src={headshot} alt="Duncan's Headshot"></img>
        </div>
    )
}

export default Headshot